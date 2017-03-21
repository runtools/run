import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {spawn} from 'child-process-promise';
import stream from 'stream';
import {quote} from 'quote-unquote';
import isDirectory from 'is-directory';
import nodeVersion from 'node-version';

import {throwUserError, formatPath, formatCode} from 'run-common';

import Engine from './';
import VersionRange from '../version-range';

export class NodeEngine extends Engine {
  static create(definition, context) {
    if (!definition) {
      throw new Error("'definition' property is missing");
    }
    const engine = {
      name: definition.name,
      version: VersionRange.create(definition.version || '>=0.0.0', context)
    };
    return new this(engine);
  }

  async run({file: requestedFile, arguments: args, config, context}) {
    const file = this.searchFile(requestedFile);
    if (!file) {
      throwUserError(`${formatCode(this.name)} engine cannot load ${formatPath(requestedFile)}`, {
        context
      });
    }

    let result;

    if (this.version.includes(nodeVersion.long)) {
      // The running node satisfies the required version
      // Let's use it to run the file and save 100 ms
      result = require(file)(args, config);
    } else {
      // The running node doesn't satisfy the required version
      // TODO: Install and use the required version

      const script = `JSON.stringify({__run__: {result: require(${quote(file)})(${JSON.stringify(args)}, ${JSON.stringify(config)})}})`;

      const promise = spawn('node', ['--print', script], {
        stdio: [process.stdin, 'pipe', process.stderr]
      });

      promise.childProcess.stdout.pipe(
        new stream.Writable({
          write(chunk, encoding, next) {
            const str = chunk.toString();
            if (str.startsWith('{"__run__":{')) {
              // Intercept the result
              result = JSON.parse(str).__run__.result;
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

export default NodeEngine;
