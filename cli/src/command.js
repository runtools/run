import {resolve, isAbsolute} from 'path';
import {entries, defaults, cloneDeep, defaultsDeep} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatCode} from 'run-common';

import Expression from './expression';
import Alias from './alias';
import Parameter from './parameter';
import Option from './option';
import Engine from './engine';

export class Command {
  constructor(command) {
    Object.assign(this, command);
  }

  static create(dir, definition, context, defaultName) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (typeof definition === 'string') {
      if (definition.startsWith('.') || isAbsolute(definition)) {
        definition = {source: definition};
      } else {
        definition = [definition];
      }
    }

    if (Array.isArray(definition)) {
      definition = {run: definition};
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Command ${formatCode('name')} property is missing`, {context});
    }

    context = this.extendContext(context, {name});

    if (!(definition.source || definition.run)) {
      throwUserError(
        `Command ${formatCode('source')} or ${formatCode('run')} property is missing`,
        {
          context
        }
      );
    }

    avoidCommonMistakes(
      definition,
      {
        alias: 'aliases',
        src: 'source',
        runs: 'run',
        parameter: 'parameters',
        params: 'parameters',
        option: 'options'
      },
      {
        context
      }
    );

    const command = new this({
      name,
      aliases: Alias.createMany(definition.aliases || [], context),
      source: definition.source && resolve(dir, definition.source),
      expressions: definition.run && Expression.createMany(dir, definition.run, context),
      parameters: Parameter.createMany(definition.parameters || [], context),
      options: Option.createMany(definition.options || {}, context),
      engine: definition.engine && Engine.create(definition.engine, context)
    });

    return command;
  }

  static createMany(dir, definitions, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (!definitions) {
      throw new Error("'definitions' argument is missing");
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(dir, definition, context));
    }

    return entries(definitions).map(([name, definition]) =>
      this.create(dir, definition, context, name));
  }

  static extendContext(base, obj) {
    return {...base, command: obj.name};
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(runner, tool, expression, context) {
    context = this.constructor.extendContext(context, this);

    const [...args] = expression.arguments;
    const defaultArgs = this.parameters.map(param => param.default);
    defaults(args, defaultArgs);
    // TODO: omit arguments not defined in the command parameters

    const config = cloneDeep(expression.config);
    defaultsDeep(config, runner.config, this.getDefaultConfig(), tool.getDefaultConfig());
    // TODO: omit config properties not defined in the command options

    if (this.source) {
      const engine = this.engine || tool.getEngine() || runner.engine;
      const file = this.source;

      if (!engine) {
        throwUserError('Cannot run a file without an engine', {
          context: {...context, file}
        });
      }

      return await engine.run({file, arguments: args, config, context});
    }

    let result;
    for (let cmdExpression of this.expressions) {
      cmdExpression = cmdExpression.resolveVariables({arguments: args, config});
      result = await runner.run(cmdExpression, context);
    }
    return result;
  }

  getDefaultConfig() {
    const config = {};
    for (const option of this.options) {
      config[option.name] = option.default;
    }
    return config;
  }
}

export default Command;
