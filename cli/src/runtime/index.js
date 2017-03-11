import {join} from 'path';
import {existsSync} from 'fs';

export class Runtime {
  constructor(runtime) {
    Object.assign(this, runtime);
  }

  static create(obj) {
    if (!obj) {
      throw new Error("'obj' property is missing");
    }

    let runtime = obj;

    if (typeof runtime === 'string') {
      const [name, version] = runtime.split('@');
      runtime = {name, version};
    }

    if (!runtime.name) {
      throw new Error("Runtime 'name' property is missing");
    }

    if (!existsSync(join(__dirname, runtime.name + '.js'))) {
      throw new Error(`Runtime '${runtime.name}' is not supported`);
    }

    return require('./' + runtime.name).default.create(runtime);
  }

  clone() {
    return new this.constructor({...this});
  }
}

export default Runtime;
