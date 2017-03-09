import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
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

  async run({file: requestedFile, arguments: args, config}) {
    let file = this.searchFile(requestedFile);

    if (!file) {
      throw createUserError(
        `${formatCode(this.name)} runtime cannot load ${formatPath(requestedFile)}`
      );
    }

    let result;

    if (this.version.includes(nodeVersion.long)) {
      // The running node satisfies the required version
      // Let's use it to run the file and save 100 ms
      result = require(file)(args, config);
    } else {
      // The running node doesn't satisfy the required version
      // TODO: Install and use the required version

      const script = `JSON.stringify({__high__: {result: require(${quote(file)})(${JSON.stringify(args)}, ${JSON.stringify(config)})}})`;

      const promise = spawn('node', ['--print', script], {
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

  searchFile(file) {
    if (isDirectory.sync(file)) {
      const dir = file;
      let main;
      const packageFile = join(dir, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
        main = pkg.main;
      } catch (_) {
        // File not found or JSON parse error
      }
      const mainFile = join(dir, main || 'index.js');
      if (existsSync(mainFile)) {
        return mainFile;
      }
    } else {
      if (existsSync(file)) {
        return file;
      }
      const fileWithExtension = file + '.js';
      if (existsSync(fileWithExtension)) {
        return fileWithExtension;
      }
    }

    return undefined;
  }
}

export default NodeRuntime;
