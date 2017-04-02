import {entries} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatString, formatCode} from 'run-common';

import Alias from './alias';

export class Entity {
  constructor(entity) {
    Object.assign(this, entity);
  }

  static async create(definition, {parent, defaultName, context}) {
    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (!(definition !== null && typeof definition === 'object')) {
      throwUserError(`Entity definition must be an object`, {context});
    }

    avoidCommonMistakes(definition, {alias: 'aliases'}, {context});

    const name = definition.name || defaultName;

    const entity = new this({
      parentEntity: parent,
      name: name && this.normalizeName(name, context),
      aliases: Alias.createMany(definition.aliases || [], context)
    });

    return entity;
  }

  static createMany(definitions, {parent, context}) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    if (!definitions) {
      throw new Error("'definitions' argument is missing");
    }

    if (Array.isArray(definitions)) {
      return Promise.all(definitions.map(definition => this.create(definition, {parent, context})));
    }

    return Promise.all(
      entries(definitions).map(([name, definition]) =>
        this.create(definition, {parent, defaultName: name, context}))
    );
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

  async run(expression, {context}) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display entity help');
      return;
    }

    const command = this.findCommand && this.findCommand(commandName);
    if (command) {
      return await command.run(this, newExpression, {context});
    }

    const group = this.findGroup && this.findGroup(commandName);
    if (group) {
      return await group.run(newExpression, {context});
    }

    const includedResource = this.findIncludedResource(commandName);
    if (includedResource) {
      return await includedResource.run(newExpression, {context});
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
  }

  static normalizeName(name, context) {
    if (!name) {
      throw new Error("'name' argument is missing");
    }

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
