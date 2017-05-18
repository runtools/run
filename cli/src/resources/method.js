import {addContextToErrors, formatCode} from 'run-common';

import Resource from './';

export class MethodResource extends Resource {
  constructor(definition, options) {
    super(definition, options);
    addContextToErrors(() => {}).call(this);
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
      // TODO: validate arguments
      return implementation.apply(this, args);
    };
  }
}

export default MethodResource;
