import {avoidCommonMistakes} from 'run-common';

import Command from './command';
import Option from './option';

export class Executable {
  static extend(klass) {
    for (const name of Object.getOwnPropertyNames(this.prototype)) {
      if (name === 'constructor') {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(this.prototype, name);
      Object.defineProperty(klass.prototype, name, descriptor);
    }
  }

  static async create(definition, {entity, context}) {
    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    avoidCommonMistakes(
      definition,
      {command: 'commands', option: 'options', group: 'groups'},
      {context}
    );

    const {Group} = require('./group'); // Use late 'require' to avoid a circular referencing issue

    const executable = {
      commands: await Command.createMany(definition.commands || [], {parent: entity, context}),
      options: Option.createMany(definition.options || {}, context),
      groups: await Group.createMany(definition.groups || [], {parent: entity, context})
    };

    return executable;
  }

  findCommand(name) {
    return this.find(entity => {
      for (const command of entity.commands) {
        if (command.isMatching(name)) {
          return command;
        }
      }
      return undefined;
    });
  }

  findGroup(name) {
    return this.find(entity => {
      for (const group of entity.groups) {
        if (group.isMatching(name)) {
          return group;
        }
      }
      return undefined;
    });
  }

  getDefaultConfig() {
    return this.reduce(
      (config, entity) => {
        for (const option of entity.options) {
          config[option.name] = option.default;
        }
        return config;
      },
      {}
    );
  }

  getEngine() {
    return this.find(entity => entity.engine);
  }
}

export default Executable;
