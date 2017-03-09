import {existsSync, readFileSync} from 'fs';
import {join, resolve, isAbsolute} from 'path';
import {spawn} from 'child-process-promise';
import stream from 'stream';
import {quote} from 'quote-unquote';
import isDirectory from 'is-directory';
import nodeVersion from 'node-version';

import {createUserError, formatPath, formatCode} from '@high/shared';

import Runtime from './';
import VersionRange from '../version-range';

export class NodeRuntime extends Runtime {
  static create(obj) {
    if (!obj) {
      throw new Error("'obj' property is missing");
    }
    const runtime = {
      name: obj.name,
      version: VersionRange.create(obj.version)
    };
    return new this(runtime);
  }

  async run({dir, file: requestedFile, arguments: args, config}) {
    let file = this.searchFile(dir, requestedFile);

    if (!file) {
      throw createUserError(
        `${formatCode(this.name)} runtime cannot find ${formatPath(requestedFile)} in directory ${formatPath(dir)}`
      );
    }

    let result;

    if (this.version.includes(nodeVersion.long)) {
      // The running node satisfies the required version
      // Let's use it to run the file and save 100 ms
      const cwd = process.cwd(dir);
      try {
        process.chdir(dir);
        result = require(resolve(dir, file))(args, config);
      } finally {
        process.chdir(cwd);
      }
    } else {
      // The running node doesn't satisfy the required version
      // TODO: Install and use the required version

      if (!(isAbsolute(file) || file.startsWith('.'))) {
        file = './' + file;
      }

      const script = `JSON.stringify({__high__: {result: require(${quote(file)})(${JSON.stringify(args)}, ${JSON.stringify(config)})}})`;

      const promise = spawn('node', ['--print', script], {
        cwd: dir,
        stdio: [process.stdin, 'pipe', process.stderr]
      });

      promise.childProcess.stdout.pipe(
        new stream.Writable({
          write: function(chunk, encoding, next) {
            const str = chunk.toString();
            if (str.startsWith('{"__high__":{')) {
              // Intercept the result
              result = JSON.parse(str).__high__.result;
            } else {
              process.stdout.write(chunk, encoding);
            }
            next();
          }
        })
      );

      await promise;
    }

    return result;
  }

  searchFile(dir, requestedFile) {
    let file = requestedFile;

    if (isDirectory.sync(resolve(dir, file))) {
      let main;
      const packageFile = resolve(dir, join(requestedFile, 'package.json'));
      try {
        const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
        main = pkg.main;
      } catch (_) {
        // File not found or JSON parse error
      }
      file = join(requestedFile, main || 'index.js');
      if (existsSync(resolve(dir, file))) {
        return file;
      }
    } else {
      if (existsSync(resolve(dir, file))) {
        return file;
      }
      file = requestedFile + '.js';
      if (existsSync(resolve(dir, file))) {
        return file;
      }
    }

    return undefined;
  }
}

export default NodeRuntime;
