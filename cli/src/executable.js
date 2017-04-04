import {avoidCommonMistakes, callSuper} from 'run-common';

import Command from './command';
import Option from './option';
import Engine from './engine';

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
      {command: 'commands', option: 'options', group: 'groups', engines: 'engine'},
      {context}
    );

    const {Group} = require('./group'); // Use late 'require' to avoid a circular referencing issue

    const executable = {
      commands: await Command.createMany(definition.commands || [], {parent: entity, context}),
      options: Option.createMany(definition.options || {}, {context}),
      groups: await Group.createMany(definition.groups || [], {parent: entity, context}),
      engine: definition.engine && Engine.create(definition.engine, context)
    };

    return executable;
  }

  toJSON() {
    return {
      ...callSuper(Executable.prototype.toJSON, this),
      commands: this.commands.length ? this.commands : undefined,
      options: this.options.length ? this.options : undefined,
      groups: this.groups.length ? this.groups : undefined,
      engine: this.engine
    };
  }

  async run(expression, {context}) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display executable help');
      return;
    }

    const command = this.findCommand(commandName);
    if (command) {
      return await command.run(this, newExpression, {context});
    }

    const group = this.findGroup(commandName);
    if (group) {
      return await group.run(newExpression, {context});
    }

    return await callSuper(Executable.prototype.run, this, expression, {context});
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
