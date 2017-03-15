import {entries} from 'lodash';
import {throwUserError, formatCode} from 'run-common';

export class Argument {
  constructor(arg) {
    Object.assign(this, arg);
  }

  static create(obj, context, defaultName) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj !== 'object') {
      obj = {default: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throwUserError(`Argument ${formatCode('name')} property is missing`, {context});
    }

    const arg = new this({
      name,
      default: obj.default
    });

    return arg;
  }

  static createMany(objs, context) {
    if (!objs) {
      throw new Error("'objs' parameter is missing");
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj, context));
    }

    return entries(objs).map(([name, obj]) => this.create(obj, context, name));
  }
}

export default Argument;
