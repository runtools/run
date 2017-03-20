import {join} from 'path';
import {existsSync} from 'fs';
import {throwUserError, formatCode, formatPath} from 'run-common';

export class Runtime {
  constructor(runtime) {
    Object.assign(this, runtime);
  }

  static create(definition, context) {
    if (!definition) {
      throw new Error("'definition' property is missing");
    }

    let runtime = definition;

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
