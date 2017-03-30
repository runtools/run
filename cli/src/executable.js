import {dirname} from 'path';
import {throwUserError, avoidCommonMistakes, formatCode} from 'run-common';

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

  static assign(toolOrGroup, definition, context) {
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

    const dir = dirname(toolOrGroup.resourceFile);

    const {Group} = require('./group'); // Use late 'require' to avoid a circular referencing issue

    Object.assign(toolOrGroup, {
      commands: Command.createMany(dir, definition.commands || [], context),
      options: Option.createMany(definition.options || {}, context),
      groups: Group.createMany(toolOrGroup, definition.groups || [], context)
    });
  }

  async run(runner, expression, context) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display group help');
      return;
    }

    const cmd = this.findCommand(commandName);
    if (cmd) {
      return await cmd.run(runner, this, newExpression, context);
    }

    const group = this.findGroup(commandName);
    if (group) {
      return await group.run(runner, newExpression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
  }

  findCommand(name) {
    return this.find(toolOrGroup => {
      for (const cmd of toolOrGroup.commands) {
        if (cmd.isMatching(name)) {
          return cmd;
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
