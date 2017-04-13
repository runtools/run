import {dirname} from 'path';
import {avoidCommonMistakes, addContextToErrors, callSuper} from 'run-common';

import Resource from './resource';
import Command from './command';
import Option from './option';
import Engine from './engine';

export class Tool extends Resource {
  static async create(definition, {resource, source, file, context} = {}) {
    if (!resource) {
      resource = await Resource.create(definition, {source, file, context});
    }

    avoidCommonMistakes(
      definition,
      {command: 'commands', option: 'options', engines: 'engine'},
      {context}
    );

    const tool = new this({...resource});

    context = this.extendContext(context, tool);

    const dir = dirname(tool.getResourceFile());

    Object.assign(tool, {
      commands: await Command.createMany(definition.commands || [], {dir, context}),
      options: Option.createMany(definition.options || {}, {context}),
      engine: definition.engine && Engine.create(definition.engine, context)
    });

    return tool;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      commands: this.commands.length ? this.commands : undefined,
      options: this.options.length ? this.options : undefined,
      engine: this.engine
    };
  }

  static extendContext(base, tool) {
    return {...base, tool: tool.getResourceFile()};
  }

  @addContextToErrors()
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

    return await callSuper(Tool.prototype.run, this, expression, {context});
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

export default Tool;
