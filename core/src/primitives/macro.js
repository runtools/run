import {isEmpty} from 'lodash';
import {isAbsolute} from 'path';
import {parse} from 'shell-quote';
import {getProperty} from '@resdir/util';
import {catchContext, formatCode} from '@resdir/console';

import Resource from '../resource';
import CommandResource from './command';

export class MacroResource extends CommandResource {
  async $construct(definition, options) {
    await super.$construct(definition, options);
    catchContext(this, () => {
      const expressions = getProperty(definition, '@expressions', ['@expression']);
      if (expressions !== undefined) {
        this.$expressions = expressions;
      }
    });
  }

  get $expressions() {
    return this._getInheritedValue('_expressions');
  }

  set $expressions(expressions) {
    if (typeof expressions === 'string') {
      expressions = [expressions];
    }
    this._expressions = expressions;
  }

  _getImplementation() {
    const macroResource = this;
    return function (...args) {
      const options = args.pop();
      const expression = {arguments: args, options};
      return macroResource._run(expression, {parent: this});
    };
  }

  async _run(expression, {parent} = {}) {
    const macroExpressions = this.$expressions || [];
    let result;
    for (let macroExpression of macroExpressions) {
      // TODO: Replace 'shell-quote' with something more suitable

      // // Prevent 'shell-quote' from interpreting operators:
      // for (const operator of '|&;()<>') {
      //   macroExpression = macroExpression.replace(
      //     new RegExp('\\' + operator, 'g'),
      //     '\\' + operator
      //   );
      // }

      let args = parse(macroExpression, variable => {
        if (!variable.startsWith('@')) {
          return '$' + variable;
        }

        if (variable.startsWith('@arguments[') && variable.endsWith(']')) {
          // TODO: Handle variadic macros
          let index = variable.slice('@arguments['.length, -1);
          if (!/\d+/.test(index)) {
            throw new Error(
              `Invalid argument index (not a number) found in a macro variable: ${formatCode(
                index
              )}`
            );
          }
          index = Number(index);
          if (index > expression.arguments.length - 1) {
            throw new Error(
              `Invalid argument index (out of range) found in a macro variable: ${formatCode(
                String(index)
              )}`
            );
          }
          return String(expression.arguments[index]);
        }

        if (variable.startsWith('@options.')) {
          const key = variable.slice('@options.'.length);
          if (!(key in expression.options)) {
            throw new Error(`Invalid option name found in a macro variable: ${formatCode(key)}`);
          }
          return String(expression.options[key]);
        }

        throw new Error(`Invalid macro variable: ${formatCode(variable)}`);
      });

      args = args.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        throw new Error(`Argument parsing failed (arg: ${JSON.stringify(arg)})`);
      });

      macroExpression = parseCommandLineArguments(args);

      result = await this._runExpression(macroExpression, {parent});
    }
    return result;
  }

  async _runExpression(expression, {parent}) {
    const firstArgument = expression.arguments[0];
    if (
      firstArgument &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource path
      parent = await Resource.$load(firstArgument, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      expression = {...expression, arguments: expression.arguments.slice(1)};
    }
    return await parent.$invoke(expression);
  }

  $serialize(opts) {
    let definition = super.$serialize(opts);

    if (definition === undefined) {
      definition = {};
    }

    const expressions = this._expressions;
    if (expressions !== undefined) {
      if (expressions.length === 1) {
        definition['@expression'] = expressions[0];
      } else if (expressions.length > 1) {
        definition['@expressions'] = expressions;
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

  const result = {arguments: [], options: {}};

  for (let i = 0; i < argsAndOpts.length; i++) {
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

      result.options[opt] = val;
      continue;
    }

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('-')) {
      const opts = argOrOpt.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (!/[\w\d]/.test(opt)) {
          throw new Error(`Invalid command line option: ${formatCode(argOrOpt)}`);
        }
        result.options[opt] = 'true';
      }
      continue;
    }

    const argument = argOrOpt;
    result.arguments.push(argument);
  }

  return result;
}

export default MacroResource;
