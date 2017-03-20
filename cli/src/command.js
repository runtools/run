import {resolve, isAbsolute} from 'path';
import {entries, defaults, defaultsDeep, clone} from 'lodash';
import {throwUserError, checkMistakes, formatCode} from 'run-common';

import Expression from './expression';
import Alias from './alias';
import Parameter from './parameter';
import Option from './option';
import Runtime from './runtime';

export class Command {
  constructor(command) {
    Object.assign(this, command);
  }

  static create(definition, context, defaultName) {
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

    checkMistakes(
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
      source: definition.source,
      expressions: definition.run && Expression.createMany(definition.run, context),
      parameters: Parameter.createMany(definition.parameters || [], context),
      options: Option.createMany(definition.options || {}, context),
      runtime: definition.runtime && Runtime.create(definition.runtime, context)
    });

    return command;
  }

  static createMany(definitions, context) {
    if (!definitions) {
      throw new Error("'definitions' argument is missing");
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(definition, context));
    }

    return entries(definitions).map(([name, definition]) => this.create(definition, context, name));
  }

  static extendContext(base, obj) {
    return {...base, command: formatCode(obj.name)};
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(tool, expression, globalConfig, context) {
    context = this.constructor.extendContext(context, this);

    const [...args] = expression.arguments;
    const defaultArgs = this.parameters.map(param => param.default);
    defaults(args, defaultArgs);
    // TODO: omit arguments not defined in the command parameters

    const config = clone(expression.config);
    defaultsDeep(config, globalConfig, this.getDefaultConfig(), tool.getDefaultConfig());
    // TODO: omit config properties not defined in the command options

    if (this.source) {
      const runtime = this.runtime || tool.runtime;
      const file = resolve(tool.dir, this.source);
      return await runtime.run({file, arguments: args, config, context});
    }

    let result;
    for (let cmdExpression of this.expressions) {
      cmdExpression = cmdExpression.resolveVariables({arguments: args, config});
      result = tool.run(cmdExpression, globalConfig, context);
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
