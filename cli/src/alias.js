import {throwUserError, formatCode} from 'run-common';

export class Alias {
  constructor(value) {
    this.value = value;
  }

  static create(alias, {context}) {
    if (!alias) {
      throw new Error("'alias' property is missing");
    }

    if (typeof alias !== 'string') {
      throwUserError('Invalid alias definition.', {info: 'A string was expected.', context});
    }

    return new this(alias);
  }

  static createMany(aliases, {context}) {
    if (!aliases) {
      throw new Error("'aliases' argument is missing");
    }

    if (typeof aliases === 'string') {
      return [this.create(aliases, {context})];
    }

    if (Array.isArray(aliases)) {
      return aliases.map(alias => this.create(alias, {context}));
    }

    throwUserError(`${formatCode('aliases')} property should be a string or an array`, {context});
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return this.value;
  }
}

export default Alias;
