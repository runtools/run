import {entries} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatString, formatCode} from 'run-common';

import Alias from './alias';

export class Entity {
  constructor(entity) {
    Object.assign(this, entity);
  }

  static async create(definition: {}, {parent, defaultName, context}) {
    avoidCommonMistakes(definition, {alias: 'aliases'}, {context});

    const name = definition.name || defaultName;

    const entity = new this({
      parentEntity: parent,
      name: name && this.normalizeName(name, context),
      aliases: Alias.createMany(definition.aliases || [], {context})
    });

    return entity;
  }

  static createMany(definitions: Array | Object, {parent, context}: {parent: Entity}) {
    if (Array.isArray(definitions)) {
      return Promise.all(definitions.map(definition => this.create(definition, {parent, context})));
    }

    return Promise.all(
      entries(definitions).map(([name, definition]) =>
        this.create(definition, {parent, defaultName: name, context}))
    );
  }

  toJSON() {
    return {
      name: this.name,
      aliases: this.aliases.length ? this.aliases : undefined
    };
  }

  toIdentifier() {
    return this.name;
  }

  async run(expression, {_context}) {
    const commandName = expression.getCommandName();

    if (!commandName) {
      console.log('TODO: display entity help');
      return;
    }

    throw new Error(`Command ${formatCode(commandName)} not found`);
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  find(fn) {
    const result = fn(this);
    if (result !== undefined) {
      return result;
    }
    if (this.parentEntity) {
      return this.parentEntity.find(fn);
    }
    return undefined;
  }

  reduce(fn, accumulator) {
    fn(accumulator, this);
    if (this.parentEntity) {
      return this.parentEntity.reduce(fn, accumulator);
    }
    return accumulator;
  }

  static normalizeName(name: string, context) {
    name = name.trim();

    if (!this.validateName(name)) {
      throwUserError(`Entity name ${formatString(name)} is invalid`, {context});
    }

    return name;
  }

  static validateName(name) {
    return this.validateNamePart(name);
  }

  static validateNamePart(part) {
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
