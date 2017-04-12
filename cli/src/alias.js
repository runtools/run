export class Alias {
  constructor(value) {
    this.value = value;
  }

  static create(alias: string, {_context}) {
    return new this(alias);
  }

  static createMany(aliases: Array<string> | string, {context}) {
    if (typeof aliases === 'string') {
      return [this.create(aliases, {context})];
    }

    return aliases.map(alias => this.create(alias, {context}));
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return this.value;
  }
}

export default Alias;
