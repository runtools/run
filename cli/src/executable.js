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

  static async assign(toolOrGroup, definition, context) {
    if (!toolOrGroup) {
      throw new Error("'toolOrGroup' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    avoidCommonMistakes(
      definition,
      {command: 'commands', option: 'options', group: 'groups'},
      {context}
    );

    const {Group} = require('./group'); // Use late 'require' to avoid a circular referencing issue

    Object.assign(toolOrGroup, {
      commands: await Command.createMany(definition.commands || [], {parent: toolOrGroup, context}),
      options: Option.createMany(definition.options || {}, context),
      groups: await Group.createMany(definition.groups || [], {parent: toolOrGroup, context})
    });
  }

  findCommand(name) {
    return this.find(toolOrGroup => {
      for (const command of toolOrGroup.commands) {
        if (command.isMatching(name)) {
          return command;
        }
      }
      return undefined;
    });
  }

  findGroup(name) {
    return this.find(toolOrGroup => {
      for (const group of toolOrGroup.groups) {
        if (group.isMatching(name)) {
          return group;
        }
      }
      return undefined;
    });
  }

  getDefaultConfig() {
    return this.reduce(
      (config, toolOrGroup) => {
        for (const option of toolOrGroup.options) {
          config[option.name] = option.default;
        }
        return config;
      },
      {}
    );
  }

  getEngine() {
    return this.find(toolOrGroup => toolOrGroup.engine);
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }
}

export default Executable;
