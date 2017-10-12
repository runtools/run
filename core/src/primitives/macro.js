import {isEmpty} from 'lodash';
import {isAbsolute} from 'path';
import {parse} from 'shell-quote';
import {getProperty} from '@resdir/util';
import {catchContext, formatCode} from '@resdir/console';

import Resource from '../resource';
import MethodResource from './method';
import {makePositionalArgumentKey, getFirstArgument, shiftArguments} from '../arguments';

export class MacroResource extends MethodResource {
  async $construct(definition, options) {
    await super.$construct(definition, options);
    catchContext(this, () => {
      const expression = getProperty(definition, '@expression');
      if (expression !== undefined) {
        this.$expression = expression;
      }
    });
  }

  get $expression() {
    return this._getInheritedValue('_expression');
  }

  set $expression(expression) {
    if (typeof expression === 'string') {
      expression = [expression];
    }
    this._expression = expression;
  }

  _getImplementation() {
    const macroResource = this;
    return function (args) {
      return macroResource._run(args, {parent: this});
    };
  }

  async _run(args, {parent} = {}) {
    let result;

    for (const expression of this.$expression || []) {
      // TODO: Replace 'shell-quote' with something more suitable

      // // Prevent 'shell-quote' from interpreting operators:
      // for (const operator of '|&;()<>') {
      //   expression = expression.replace(
      //     new RegExp('\\' + operator, 'g'),
      //     '\\' + operator
      //   );
      // }

      let macroArguments = parse(expression, variable => {
        if (!(variable in args)) {
          throw new Error(`Invalid variable found in a macro: ${formatCode(variable)}`);
        }
        return String(args[variable]);
      });

      macroArguments = macroArguments.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        throw new Error(`Argument parsing failed (arg: ${JSON.stringify(arg)})`);
      });

      macroArguments = parseCommandLineArguments(macroArguments);

      result = await this._runExpression(macroArguments, {parent});
    }

    return result;
  }

  async _runExpression(args, {parent}) {
    const firstArgument = getFirstArgument(args);
    if (
      firstArgument !== undefined &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource identifier
      parent = await Resource.$load(firstArgument, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      args = {...args};
      shiftArguments(args);
    }
    return await parent.$invoke(args);
  }

  $serialize(opts) {
    let definition = super.$serialize(opts);

    if (definition === undefined) {
      definition = {};
    }

    const expression = this._expression;
    if (expression !== undefined) {
      if (expression.length === 1) {
        definition['@expression'] = expression[0];
      } else if (expression.length > 1) {
        definition['@expression'] = expression;
      }
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

export function parseCommandLineArguments(argsAndOpts) {
  if (!Array.isArray(argsAndOpts)) {
    throw new TypeError('\'argsAndOpts\' must be an array');
  }

  const result = {};

  for (let i = 0, position = 0; i < argsAndOpts.length; i++) {
    const argOrOpt = argsAndOpts[i];

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('--')) {
      let opt = argOrOpt.slice(2);
      let val;

      const index = opt.indexOf('=');
      if (index !== -1) {
        val = opt.slice(index + 1);
        opt = opt.slice(0, index);
      }

      if (val === undefined) {
        if (opt.startsWith('no-')) {
          val = 'false';
          opt = opt.slice(3);
        } else if (opt.startsWith('non-')) {
          val = 'false';
          opt = opt.slice(4);
        }
      }

      if (val === undefined && i + 1 < argsAndOpts.length) {
        const nextArgOrOpt = argsAndOpts[i + 1];
        if (typeof nextArgOrOpt !== 'string' || !nextArgOrOpt.startsWith('-')) {
          val = nextArgOrOpt;
          i++;
        }
      }

      if (val === undefined) {
        val = 'true';
      }

      result[opt] = val;
      continue;
    }

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('-')) {
      const opts = argOrOpt.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (!/[\w\d]/.test(opt)) {
          throw new Error(`Invalid command line option: ${formatCode(argOrOpt)}`);
        }
        result[opt] = 'true';
      }
      continue;
    }

    result[makePositionalArgumentKey(position)] = argOrOpt;
    position++;
  }

  return result;
}

export default MacroResource;
