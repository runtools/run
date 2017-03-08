import {resolve, relative, isAbsolute} from 'path';
import {spawn} from 'child-process-promise';
import {quote} from 'quote-unquote';

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

  async run({invocation, cwd}) {
    let file = invocation.name;
    if (!isAbsolute(file)) {
      file = resolve(invocation.cwd, file);
      file = relative(cwd, file);
      if (!file.startsWith('.')) {
        file = './' + file;
      }
    }
    const script = `require(${quote(file)})()`;
    const args = ['--eval', script];
    await spawn('node', args, {cwd, stdio: 'inherit'});
  }
}

export default NodeRuntime;
