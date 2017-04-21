import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {spawn} from 'child-process-promise';
import stream from 'stream';
import {quote} from 'quote-unquote';
import isDirectory from 'is-directory';
import nodeVersion from 'node-version';

import {throwUserError, formatPath, formatCode} from 'run-common';

import Runtime from './base';

export class NodeRuntime extends Runtime {
  async run({file: requestedFile, arguments: args, config, context}) {
    const file = this.searchFile(requestedFile);
    if (!file) {
      throwUserError(`${formatCode(this.name)} runtime cannot load ${formatPath(requestedFile)}`, {
        context
      });
    }

    context = {...context, file};

    let result;

    if (this.version.includes(nodeVersion.long)) {
      // The running node satisfies the required version
      // Let's use it to run the file and save 100 ms

      const module = require(file);

      let fn = module.default; // ES6 module
      if (typeof fn !== 'function') {
        fn = module; // CommonJS module
      }
      if (typeof fn !== 'function') {
        throwUserError(`Exported function not found`, {context});
      }
      try {
        result = {result: await fn(args, config, context)};
      } catch (error) {
        result = {error};
      }
    } else {
      // The running node doesn't satisfy the required version
      // TODO: Install and use the required version

      const script = `
        Promise.resolve(
          (require(${quote(file)}).default || require(${quote(file)}))
            (${JSON.stringify(args)}, ${JSON.stringify(config)}, ${JSON.stringify(context)})
        ).then(function(result) {
          console.log(JSON.stringify({__run__: {result: result}}));
        }).catch(function(err) {
          console.log(JSON.stringify({__run__: {error: err}}));
        })`;

      const promise = spawn('node', ['--eval', script], {
        stdio: [process.stdin, 'pipe', process.stderr]
      });

      promise.childProcess.stdout.pipe(
        new stream.Writable({
          write(chunk, encoding, next) {
            const str = chunk.toString();
            if (str.startsWith('{"__run__":{')) {
              // Intercept the result
              result = JSON.parse(str).__run__;
            } else {
              process.stdout.write(chunk, encoding);
            }
            next();
          }
        })
      );

      await promise;
    }

    if (result.error) {
      throwUserError(result.error.message, {
        context: config.debug ? context : undefined,
        hidden: result.error.hidden,
        capturedStandardError: result.error.capturedStandardError
      });
    }

    return result.result;
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
