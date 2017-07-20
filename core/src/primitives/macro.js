import {isEmpty} from 'lodash';
import {isAbsolute} from 'path';
import {parse} from 'shell-quote';
import {getProperty, parseCommandLineArguments} from 'run-common';
import {addContextToErrors, formatCode} from '@resdir/console';

import Resource from '../resource';
import CommandResource from './command';

export class MacroResource extends CommandResource {
  async $construct(definition, options) {
    await super.$construct(definition, options);
    addContextToErrors(() => {
      const expressions = getProperty(definition, '@expressions', ['@expression']);
      if (expressions !== undefined) {
        this.$expressions = expressions;
      }
    }).call(this);
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
      const args = parse(macroExpression, variable => {
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
          const name = variable.slice('@options.'.length);
          if (!(name in expression.options)) {
            throw new Error(`Invalid option name found in a macro variable: ${formatCode(name)}`);
          }
          return String(expression.options[name]);
        }

        throw new Error(`Invalid macro variable: ${formatCode(variable)}`);
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

export default MacroResource;
