import {compact, isEmpty} from 'lodash';
import {getProperty, addContextToErrors, formatCode} from 'run-common';

import {createResource} from './';
import BaseResource from './base';

export class MethodResource extends BaseResource {
  constructor(definition, options = {}) {
    super(definition, options);

    this.$addInitializer(
      addContextToErrors(async () => {
        const parameters = getProperty(definition, '$parameters', ['$parameter']);
        if (parameters !== undefined) {
          await this.$setParameters(parameters);
        }

        this._setImplementation(options.owner);
      }).call(this)
    );
  }

  $getParameters() {
    return this._getProperty('_parameters');
  }

  async $setParameters(parameters) {
    this._parameters = undefined;
    if (parameters === undefined) return;
    if (!Array.isArray(parameters)) {
      parameters = [parameters];
    }
    for (let parameter of parameters) {
      parameter = await createResource(parameter, {directory: this.$getDirectory()});
      if (this._parameters === undefined) {
        this._parameters = [];
      }
      this._parameters.push(parameter);
    }
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
    for (const parameter of parameters) {
      const argument = remainingArguments.shift();
      const normalizedArgument = parameter.$instantiate(argument, {parse}).$get();
      normalizedArguments.push(normalizedArgument);
    }

    return {normalizedArguments, remainingArguments};
  }

  async $invoke(expression, {owner}) {
    const fn = this.$getFunction({parseArguments: true});
    return await fn.apply(owner, expression.arguments);
  }

  $serialize(options) {
    let result = super.$serialize(options);

    if (result === undefined) {
      result = {};
    }

    let parameters = this._parameters;
    if (parameters) {
      parameters = parameters.map(parameter => parameter.$serialize());
      parameters = compact(parameters);
      if (parameters.length === 1) {
        result.$parameter = parameters[0];
      } else if (parameters.length > 1) {
        result.$parameters = parameters;
      }
    }

    if (isEmpty(result)) {
      result = undefined;
    }

    return result;
  }
}

export default MethodResource;
