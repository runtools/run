import {join} from 'path';
import {existsSync} from 'fs';
import {throwUserError, formatCode, formatPath} from 'run-common';

export class Runtime {
  constructor(runtime) {
    Object.assign(this, runtime);
  }

  static create(obj, context) {
    if (!obj) {
      throw new Error("'obj' property is missing");
    }

    let runtime = obj;

    if (typeof runtime === 'string') {
      const [name, version] = runtime.split('@');
      runtime = {name, version};
    }

    if (!runtime.name) {
      throwUserError(`Runtime ${formatCode('name')} property is missing`, {context});
    }

    if (!existsSync(join(__dirname, runtime.name + '.js'))) {
      throwUserError(`Runtime ${formatPath(runtime.name)} is not supported`, {context});
    }

    return require('./' + runtime.name).default.create(runtime, context);
  }
}

export default Runtime;
