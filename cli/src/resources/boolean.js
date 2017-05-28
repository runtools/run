import {formatString} from 'run-common';

import ValueResource from './value';

export class BooleanResource extends ValueResource {
  constructor(definition = {}, options) {
    if (typeof definition === 'boolean') {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid value type');
    }
    return value;
  }

  static $parseValue(str) {
    const originalString = str;
    str = str.toLowerCase();
    if (str === '1' || str === 'true' || str === 'yes' || str === 'on') {
      return true;
    } else if (str === '0' || str === 'false' || str === 'no' || str === 'off') {
      return false;
    }
    throw new Error(`Cannot convert a string to a boolean: ${formatString(originalString)}`);
  }
}

export default BooleanResource;
