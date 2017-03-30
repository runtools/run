import {entries} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatCode} from 'run-common';

import Alias from './alias';
import Executable from './executable';

export class Group {
  constructor(group) {
    Object.assign(this, group);
  }

  static create(parent, definition, context, defaultName) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (!(definition !== null && typeof definition === 'object')) {
      throwUserError(`Group definition must be an object`, {context});
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Group ${formatCode('name')} attribute is missing`, {context});
    }

    context = this.extendContext(context, {name});

    avoidCommonMistakes(definition, {alias: 'aliases'}, {context});

    const group = new this({
      parent,
      name,
      aliases: Alias.createMany(definition.aliases || [], context),
      resourceFile: parent.resourceFile
    });

    Executable.assign(group, definition, context);

    return group;
  }

  static createMany(parent, definitions, context) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    if (!definitions) {
      throw new Error("'definitions' argument is missing");
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(parent, definition, context));
    }

    return entries(definitions).map(([name, definition]) =>
      this.create(parent, definition, context, name));
  }

  static extendContext(base, obj) {
    return {...base, group: obj.name};
  }

  find(fn) {
    const result = fn(this);
    if (result !== undefined) {
      return result;
    }
    if (!this.parent) {
      return undefined;
    }
    return this.parent.find(fn);
  }

  reduce(fn, accumulator) {
    fn(accumulator, this);
    if (!this.parent) {
      return accumulator;
    }
    return this.parent.reduce(fn, accumulator);
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }
}

Executable.extend(Group);

export default Group;
