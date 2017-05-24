import {isEmpty} from 'lodash';
import {getProperty, addContextToErrors, formatCode} from 'run-common';

import Resource from './';

export class MethodResource extends Resource {
  constructor(definition, options) {
    super(definition, options);
    this._initializers.push(
      addContextToErrors(async () => {
        const parameters = getProperty(definition, '$parameters', ['$parameter']);
        if (parameters !== undefined) {
          await this.$setParameters(parameters);
        }
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
      parameter = await Resource.$create(parameter, {directory: this.$getDirectory()});
      if (this._parameters === undefined) {
        this._parameters = [];
      }
      this._parameters.push(parameter);
    }
  }

  $get() {
    const methodResource = this;
    return function(...args) {
      const proto = Object.getPrototypeOf(this);
      const name = methodResource.$id;
      const implementation = proto[name];
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(name)} method`);
      }

      const parameters = methodResource.$getParameters() || [];
      if (args.length > parameters.length) {
        throw new Error(`Too many arguments passed to ${formatCode(name)} method`);
      }

      const normalizedArguments = [];
      for (let i = 0; i < parameters.length; i++) {
        const parameter = parameters[i];
        const argument = args[i];
        const normalizedArgument = parameter.$instantiate(argument).$get();
        normalizedArguments.push(normalizedArgument);
      }

      return implementation.apply(this, normalizedArguments);
    };
  }

  $serialize(options) {
    let result = super.$serialize(options);

    if (result === undefined) {
      result = {};
    }

    const parameters = this._parameters;
    if (parameters !== undefined) {
      if (parameters.length === 1) {
        result.$parameter = parameters[0].$serialize(options);
      } else if (parameters.length > 1) {
        result.$parameters = parameters.map(parameter => parameter.$serialize(options));
      }
    }

    if (isEmpty(result)) {
      result = undefined;
    }

    return result;
  }
}

export default MethodResource;
