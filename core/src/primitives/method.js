import {compact, isEmpty} from 'lodash';
import {getProperty, setProperty, addContextToErrors, formatCode} from 'run-common';

import {createResource} from './';
import BaseResource from './base';

export class MethodResource extends BaseResource {
  constructor(definition, options = {}) {
    super(definition, options);
    addContextToErrors(() => {
      setProperty(this, definition, '$variadic');

      const parameters = getProperty(definition, '$parameters', ['$parameter']);
      if (parameters !== undefined) {
        this.$setParameters(parameters);
      }

      this._setImplementation(options.owner);
    }).call(this);
  }

  $getParameters() {
    return this._getProperty('_parameters');
  }

  $setParameters(parameters) {
    this._parameters = undefined;
    if (parameters === undefined) return;
    if (!Array.isArray(parameters)) {
      parameters = [parameters];
    }
    for (let parameter of parameters) {
      parameter = createResource(parameter, {directory: this.$getDirectory()});
      if (this._parameters === undefined) {
        this._parameters = [];
      }
      this._parameters.push(parameter);
    }
  }

  get $variadic() {
    return this._getProperty('_variadic');
  }

  set $variadic(variadic: ?boolean) {
    this._variadic = variadic;
  }

  _getImplementation() {
    return this._getProperty('_implementation');
  }

  _setImplementation(owner) {
    if (!owner) return;
    const proto = Object.getPrototypeOf(owner);
    this._implementation = proto[this.$name];
  }

  $get() {
    return this.$getFunction();
  }

  $getFunction({parseArguments} = {}) {
    const methodResource = this;

    return function(...args) {
      const {normalizedArguments, remainingArguments} = methodResource._normalizeArguments(args, {
        parse: parseArguments
      });
      if (remainingArguments.length) {
        throw new Error(`Too many arguments passed to ${formatCode(methodResource.$name)}`);
      }

      const implementation = methodResource._getImplementation();
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(methodResource.$name)}`);
      }

      return implementation.apply(this, normalizedArguments);
    };
  }

  _normalizeArguments(args, {parse}) {
    const normalizedArguments = [];
    const remainingArguments = [...args];

    const parameters = this.$getParameters() || [];
    const lastParameter = parameters[parameters.length - 1];
    const variadic = this.$variadic;
    for (const parameter of parameters) {
      let normalizedArgument;
      if (variadic && parameter === lastParameter) {
        normalizedArgument = [];
        const lastArguments = this._shiftLastArguments(remainingArguments);
        for (const argument of lastArguments) {
          normalizedArgument.push(parameter.$instantiate(argument, {parse}).$get());
        }
      } else {
        const argument = remainingArguments.shift();
        normalizedArgument = parameter.$instantiate(argument, {parse}).$get();
      }
      normalizedArguments.push(normalizedArgument);
    }

    return {normalizedArguments, remainingArguments};
  }

  _shiftLastArguments(args) {
    // In the case of a MethodResource, return every arguments
    // See CommandResource for a more useful implementation
    const lastArguments = [];
    while (args.length) {
      const arg = args.shift();
      lastArguments.push(arg);
    }
    return lastArguments;
  }

  $invoke(expression, {owner}) {
    const fn = this.$getFunction({parseArguments: true});
    return fn.apply(owner, expression.arguments);
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    let parameters = this._parameters;
    if (parameters) {
      parameters = parameters.map(parameter => parameter.$serialize());
      parameters = compact(parameters);
      if (parameters.length === 1) {
        definition.$parameter = parameters[0];
      } else if (parameters.length > 1) {
        definition.$parameters = parameters;
      }
    }

    if (this._variadic !== undefined) {
      definition.$variadic = this._variadic;
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

export default MethodResource;
