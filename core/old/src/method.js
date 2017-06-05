import {cloneDeep, defaultsDeep} from 'lodash';
import {throwUserError, avoidCommonMistakes, addContextToErrors} from 'run-common';

import Entity from './entity';
import ConfigurableMixin from './configurable';
import Parameter from './parameter';
import Expression from './expression';

export class Method extends ConfigurableMixin(Entity) {
  constructor(definition: {name: string} | string, {name, currentDir} = {}) {
    if (typeof definition === 'string') {
      definition = {name, runs: definition};
    }

    super(definition);

    this.setCurrentDir(currentDir);

    addContextToErrors(() => {
      avoidCommonMistakes(definition, {
        parameter: 'parameters',
        params: 'parameters',
        run: 'runs'
      });

      this.parameters = definition.parameters;
      this.runs = definition.runs;
    }).call(this);
  }

  getCurrentDir() {
    return this.__currentDir__;
  }

  setCurrentDir(dir) {
    this.__currentDir__ = dir;
  }

  _parameters = [];

  get parameters() {
    return this._parameters.length ? this._parameters : undefined;
  }

  set parameters(parameters: ?(Array | Object | string)) {
    this._parameters = Parameter.createMany(parameters);
  }

  _runs = [];

  get runs() {
    return this._runs.length ? this._runs : undefined;
  }

  set runs(runs: ?(Array | string)) {
    this._rawRuns = runs;

    if (runs === undefined) {
      runs = [];
    } else if (typeof runs === 'string') {
      runs = [runs];
    }

    const definitions = [];
    for (const args of runs) {
      const defs = Expression.parse(args);
      definitions.push(...defs);
    }

    this._runs = Expression.createMany(definitions, {currentDir: this.getCurrentDir()});
  }

  toJSON() {
    return {
      ...super.toJSON(),
      parameters: this.parameters,
      runs: this._rawRuns
    };
  }

  @addContextToErrors async run(entity, expression, {context}) {
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
}

export default Method;
