import {dirname} from 'path';
import {entries} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatCode} from 'run-common';

import Alias from './alias';
import Command from './command';
import Option from './option';

export class Subtool {
  constructor(subtool) {
    Object.assign(this, subtool);
  }

  static create(parent, definition, context, defaultName) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (!(definition !== null && typeof definition === 'object')) {
      throwUserError(`Subtool definition must be an object`, {context});
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Subtool ${formatCode('name')} property is missing`, {context});
    }

    context = this.extendContext(context, {name});

    avoidCommonMistakes(
      definition,
      {
        alias: 'aliases',
        command: 'commands',
        option: 'options'
      },
      {
        context
      }
    );

    const subtool = new this({
      parent,
      name,
      aliases: Alias.createMany(definition.aliases || [], context),
      commands: Command.createMany(dirname(parent.file), definition.commands || [], context),
      options: Option.createMany(definition.options || {}, context),
      file: parent.file
    });

    subtool.subtools = this.createMany(subtool, definition.subtools || [], context);

    return subtool;
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
    return {...base, subtool: formatCode(obj.name)};
  }

  async run(runner, expression, context) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display subtool help');
      return;
    }

    const cmd = this.findCommand(commandName);
    if (cmd) {
      return await cmd.run(runner, this, newExpression, context);
    }

    const subtool = this.findSubtool(commandName);
    if (subtool) {
      return await subtool.run(runner, newExpression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
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

  findCommand(name) {
    // TODO: Remove this duplicated code from Tool
    return this.find(tool => {
      for (const cmd of tool.commands) {
        if (cmd.isMatching(name)) {
          return cmd;
        }
      }
      return undefined;
    });
  }

  findSubtool(name) {
    // TODO: Remove this duplicated code from Tool
    return this.find(tool => {
      for (const subtool of tool.subtools) {
        if (subtool.isMatching(name)) {
          return subtool;
        }
      }
      return undefined;
    });
  }

  getDefaultConfig() {
    // TODO: Remove this duplicated code from Tool
    // Fetch default config from options
    return this.reduce(
      (config, tool) => {
        for (const option of tool.options) {
          config[option.name] = option.default;
        }
        return config;
      },
      {}
    );
  }

  getEngine() {
    // TODO: Remove this duplicated code from Tool
    return this.find(tool => tool.engine);
  }

  isMatching(name) {
    // TODO: Remove this duplicated code from Tool
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }
}

export default Subtool;
