import {resolve, isAbsolute, dirname} from 'path';
import {defaults, cloneDeep, defaultsDeep} from 'lodash';
import {throwUserError, avoidCommonMistakes, formatCode} from 'run-common';

import Entity from './entity';
import Expression from './expression';
import Parameter from './parameter';
import Option from './option';
import Engine from './engine';

export class Command extends Entity {
  static async create(definition, {parent, defaultName, context}) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    if (typeof definition === 'string') {
      if (definition.startsWith('.') || isAbsolute(definition)) {
        definition = {implementation: definition};
      } else {
        definition = [definition];
      }
    }

    if (Array.isArray(definition)) {
      definition = {run: definition};
    }

    const name = definition.name || defaultName;

    context = this.extendContext(context, {name});

    if (!(definition.implementation || definition.run)) {
      throwUserError(
        `Command ${formatCode('implementation')} or ${formatCode('run')} attribute is missing`,
        {
          context
        }
      );
    }

    avoidCommonMistakes(
      definition,
      {runs: 'run', parameter: 'parameters', params: 'parameters', option: 'options'},
      {context}
    );

    const command = await Entity.create.call(this, definition, {parent, defaultName, context});

    const dir = dirname(command.find(entity => entity.resourceFile));

    Object.assign(command, {
      implementation: definition.implementation && resolve(dir, definition.implementation),
      expressions: definition.run && Expression.createMany(dir, definition.run, context),
      parameters: Parameter.createMany(definition.parameters || [], context),
      options: Option.createMany(definition.options || {}, context),
      engine: definition.engine && Engine.create(definition.engine, context)
    });

    return command;
  }

  static extendContext(base, command) {
    return {...base, command: command.name};
  }

  async run(runner, entity, expression, context) {
    context = this.constructor.extendContext(context, this);

    const [...args] = expression.arguments;
    const defaultArgs = this.parameters.map(param => param.default);
    defaults(args, defaultArgs);
    // TODO: omit arguments not defined in the command parameters

    const config = cloneDeep(expression.config);
    defaultsDeep(config, this.getDefaultConfig(), entity.getDefaultConfig());
    // TODO: omit config properties not defined in the command options

    if (this.implementation) {
      const engine = this.engine || entity.getEngine();

      const file = this.implementation;

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
      result = await entity.run(runner, cmdExpression, context);
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
