import {formatString} from '@resdir/console';

import ValueResource from './value';

export class BooleanResource extends ValueResource {
  static $normalizeValue(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid value type');
    }
    return value;
  }

  static $normalize(definition, options) {
    if (typeof definition === 'boolean') {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parse(str) {
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
