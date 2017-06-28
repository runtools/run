import {compact, isEmpty} from 'lodash';
import {setProperty, addContextToErrors, formatCode} from 'run-common';

import Resource from '../resource';

export class MethodResource extends Resource {
  constructor(definition, options) {
    super(definition, options);
    addContextToErrors(() => {
      setProperty(this, definition, '$variadic');
      setProperty(this, definition, '$parameters', ['$parameter']);
    }).call(this);
  }

  get $parameters() {
    return this._getChild('_parameters');
  }

  set $parameters(parameters) {
    this._parameters = undefined;
    if (parameters === undefined) {
      return;
    }
    if (!Array.isArray(parameters)) {
      parameters = [parameters];
    }
    for (let parameter of parameters) {
      parameter = Resource.$create(parameter, {directory: this.$getDirectory()});
      if (this._parameters === undefined) {
        this._parameters = [];
      }
      this._parameters.push(parameter);
    }
  }

  get $variadic() {
    return this._getChild('_variadic');
  }

  set $variadic(variadic) {
    this._variadic = variadic;
  }

  $unwrap() {
    return this.$getFunction();
  }

  $getFunction({parseArguments} = {}) {
    const methodResource = this;

    return function (...args) {
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

    const parameters = this.$parameters || [];
    const lastParameter = parameters[parameters.length - 1];
    const variadic = this.$variadic;
    for (const parameter of parameters) {
      if (variadic && parameter === lastParameter) {
        const lastArguments = this._shiftLastArguments(remainingArguments);
        for (const argument of lastArguments) {
          const normalizedArgument = parameter.$create(argument, {parse}).$unwrap();
          normalizedArguments.push(normalizedArgument);
        }
      } else {
        const argument = remainingArguments.shift();
        const normalizedArgument = parameter.$create(argument, {parse}).$unwrap();
        normalizedArguments.push(normalizedArgument);
      }
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

  _getImplementation() {
    let implementation;
    const parent = this.$getParent();
    if (parent) {
      parent.$forSelfAndEachBase(
        resource => {
          const proto = resource.constructor.prototype;
          implementation = proto[this.$name];
          if (implementation) {
            return false;
          }
        },
        {deepSearch: true}
      );
    }
    return implementation;
  }

  $invoke(expression, {parent}) {
    const fn = this.$getFunction({parseArguments: true});
    return fn.apply(parent, expression.arguments);
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
