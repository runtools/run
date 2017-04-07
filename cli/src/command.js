import {resolve, isAbsolute, dirname} from 'path';
import {cloneDeep, defaultsDeep} from 'lodash';
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
        definition = {run: definition};
      }
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

    const dir = dirname(command.find(entity => entity.getResourceFile && entity.getResourceFile()));

    Object.assign(command, {
      implementation: definition.implementation && resolve(dir, definition.implementation),
      __implementation__: definition.implementation,
      expressions: definition.run && Expression.createMany(definition.run, {dir, context}),
      __expressions__: definition.run,
      parameters: Parameter.createMany(definition.parameters || [], {context}),
      options: Option.createMany(definition.options || {}, {context}),
      engine: definition.engine && Engine.create(definition.engine, {context})
    });

    return command;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      implementation: this.__implementation__,
      run: this.__expressions__,
      parameters: this.parameters.length ? this.parameters : undefined,
      options: this.options.length ? this.options : undefined,
      engine: this.engine
    };
  }

  static extendContext(base, command) {
    return {...base, command: command.name};
  }

  async run(entity, expression, {context}) {
    context = this.constructor.extendContext(context, this);

    const args = this.normalizeArguments(expression, {context});

    // TODO: Implement normalizeOptions()
    const config = cloneDeep(expression.config);
    defaultsDeep(config, this.getDefaultConfig(), entity.getDefaultConfig());

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
      result = await entity.run(cmdExpression, {context});
    }
    return result;
  }

  normalizeArguments(expression, {context}) {
    const args = [...expression.arguments];
    return this.parameters.map(parameter => {
      let arg;
      if (parameter.type.isArray()) {
        arg = [...args];
        args.length = 0;
        arg = parameter.type.convert(arg, {dir: expression.dir, context});
        if (parameter.default) {
          arg = [...arg, ...parameter.default.slice(arg.length)];
        }
      } else {
        arg = args.shift();
        if (arg !== undefined) {
          arg = parameter.type.convert(arg, {dir: expression.dir, context});
        } else {
          arg = parameter.default;
        }
      }
      return arg;
    });
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
