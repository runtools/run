import {formatString} from '@resdir/console';

import ValueResource from './value';

export class NumberResource extends ValueResource {
  static $RESOURCE_TYPE = 'number';

  static $normalizeValue(value) {
    if (typeof value !== 'number') {
      throw new Error('Invalid value type');
    }
    return value;
  }

  static $normalize(definition, options) {
    if (typeof definition === 'number') {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parseValue(str) {
    const number = str && Number(str);
    if (typeof number !== 'number' || isNaN(number)) {
      throw new Error(`Cannot convert a string to a number: ${formatString(str)}`);
    }
    return number;
  }
}

export default NumberResource;
