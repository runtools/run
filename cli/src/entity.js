import {addContextToErrors, avoidCommonMistakes, formatString, formatCode} from 'run-common';

export class Entity {
  constructor(definition: {} = {}) {
    this.name = definition.name;
    addContextToErrors(() => {
      avoidCommonMistakes(definition, {alias: 'aliases'});
      this.aliases = definition.aliases;
    }).call(this);
  }

  get name() {
    return this._name;
  }

  set name(name: ?string) {
    if (name !== undefined) {
      name = name.trim();
      if (!this.validateName(name)) {
        throw new Error(`Entity name ${formatString(name)} is invalid`);
      }
    }
    this._name = name;
  }

  _aliases = new Set();

  get aliases() {
    return this._aliases.size ? Array.from(this._aliases) : undefined;
  }

  set aliases(aliases: ?(Array | string)) {
    this._aliases.clear();
    if (aliases) {
      if (typeof aliases === 'string') {
        aliases = [aliases];
      }
      for (const alias of aliases) {
        this.addAlias(alias);
      }
    }
  }

  addAlias(alias: string) {
    this._aliases.add(alias);
  }

  hasAlias(alias: string) {
    return this._aliases.has(alias);
  }

  isMatching(name: string) {
    return this.name === name || this.hasAlias(name);
  }

  toJSON() {
    return {
      name: this.name,
      aliases: this.aliases
    };
  }

  toIdentifier() {
    return this.name || 'anonymous';
  }

  async run(expression, {_context}) {
    const commandName = expression.getCommandName();

    if (!commandName) {
      console.log('TODO: display entity help');
      return;
    }

    throw new Error(`Command ${formatCode(commandName)} not found`);
  }

  // find(fn) {
  //   const result = fn(this);
  //   if (result !== undefined) {
  //     return result;
  //   }
  //   if (this.parentEntity) {
  //     return this.parentEntity.find(fn);
  //   }
  //   return undefined;
  // }
  //
  // reduce(fn, accumulator) {
  //   fn(accumulator, this);
  //   if (this.parentEntity) {
  //     return this.parentEntity.reduce(fn, accumulator);
  //   }
  //   return accumulator;
  // }

  validateName(name: string) {
    return this.validateNamePart(name);
  }

  validateNamePart(part: string) {
    if (!part) {
      return false;
    }

    if (/[^a-z0-9._-]/i.test(part)) {
      return false;
    }

    if (/[^a-z0-9]/i.test(part[0] + part[part.length - 1])) {
      return false;
    }

    return true;
  }
}

export default Entity;
