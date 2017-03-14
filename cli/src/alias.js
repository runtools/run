import {createUserError, formatCode} from 'run-common';

export class Alias {
  constructor(value) {
    this.value = value;
  }

  static create(alias) {
    if (!alias) {
      throw new Error("'alias' property is missing");
    }

    if (typeof alias !== 'string') {
      throw createUserError(`An ${formatCode('alias')} should be a string`);
    }

    return new this(alias);
  }

  static createMany(aliases = []) {
    if (typeof aliases === 'string') {
      return [this.create(aliases)];
    }

    if (Array.isArray(aliases)) {
      return aliases.map(this.create, this);
    }

    throw createUserError(`${formatCode('aliases')} property should be a string or an array`);
  }

  toString() {
    return this.value;
  }
}

export default Alias;
