import {existsSync} from 'fs';
import {join, resolve, isAbsolute} from 'path';
import isDirectory from 'is-directory';

import {formatPath} from 'run-common';

import BaseRuntime from './base';

export class NodeRuntime extends BaseRuntime {
  require(requestedFile, {directory} = {}) {
    let file = requestedFile;
    if (!isAbsolute(file) && directory) {
      file = resolve(directory, file);
    }
    file = this.searchFile(file);
    if (!file) {
      throw new Error(`File not found: ${formatPath(requestedFile)}`);
    }
    const result = require(file);
    return result.default || result;
  }

  searchFile(file) {
    if (isDirectory.sync(file)) {
      const dir = file;
      const mainFile = join(dir, 'index.js');
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
