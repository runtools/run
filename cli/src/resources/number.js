import {formatString} from 'run-common';

import ValueResource from './value';

export class NumberResource extends ValueResource {
  constructor(definition = {}, options) {
    if (typeof definition === 'number') {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value, {parse} = {}) {
    if (typeof value === 'string' && parse) {
      const number = Number(value);
      if (isNaN(number)) {
        throw new Error(`Cannot convert a string to a number: ${formatString(value)}`);
      }
      return number;
    }

    if (typeof value !== 'number') {
      throw new Error('Invalid value type');
    }

    return value;
  }
}

export default NumberResource;
