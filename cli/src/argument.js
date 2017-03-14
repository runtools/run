import {entries} from 'lodash';

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
      throw new Error("Argument 'name' property is missing");
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
