import {isEmpty} from 'lodash';
import {isAbsolute} from 'path';
import {parse} from 'shell-quote';
import {setProperty, addContextToErrors, parseCommandLineArguments} from 'run-common';

import {loadResource} from './';
import CommandResource from './command';

export class MacroResource extends CommandResource {
  constructor(definition, options) {
    super(definition, options);
    addContextToErrors(() => {
      setProperty(this, definition, '$expressions', ['$expression']);
    }).call(this);
  }

  get $expressions() {
    return this._getProperty('_expressions');
  }

  set $expressions(expressions: ?(Array<string> | string)) {
    if (typeof expressions === 'string') {
      expressions = [expressions];
    }
    this._expressions = expressions;
  }

  _setImplementation(_owner) {
    const macroResource = this;
    this._implementation = function(...args) {
      const options = args.pop();
      const expression = {arguments: args, options};
      return macroResource.$invoke(expression, {owner: this});
    };
  }

  async $invoke(_expression, {owner} = {}) {
    const expressions = this.$expressions || [];
    let result;
    for (let expression of expressions) {
      const args = parse(expression, variable => '$' + variable);
      expression = parseCommandLineArguments(args);
      result = await this._invokeExpression(expression, {owner});
    }
    return result;
  }

  async _invokeExpression(expression, {owner}) {
    const firstArgument = expression.arguments[0];
    if (
      firstArgument &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource name, let's load the resource
      owner = await loadResource(firstArgument, {directory: this.$getDirectory()});
      expression = {...expression, arguments: expression.arguments.slice(1)};
    }
    return await owner.$invoke(expression);
  }

  $serialize(opts) {
    let result = super.$serialize(opts);

    if (result === undefined) {
      result = {};
    }

    const expressions = this._expressions;
    if (expressions !== undefined) {
      if (expressions.length === 1) {
        result.$expression = expressions[0];
      } else if (expressions.length > 1) {
        result.$expressions = expressions;
      }
    }

    if (isEmpty(result)) {
      result = undefined;
    }

    return result;
  }
}

export default MacroResource;
