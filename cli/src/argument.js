import {entries} from 'lodash';
import {createUserError, formatCode} from 'run-common';

export class Argument {
  constructor(arg) {
    Object.assign(this, arg);
  }

  static create(obj, defaultName) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj !== 'object') {
      obj = {default: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throw createUserError(`Argument ${formatCode('name')} property is missing`);
    }

    const arg = new this({
      name,
      default: obj.default
    });

    return arg;
  }

  static createMany(objs = []) {
    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj));
    }

    return entries(objs).map(([name, obj]) => this.create(obj, name));
  }
}

export default Argument;
