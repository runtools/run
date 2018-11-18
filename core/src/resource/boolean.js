import {formatString} from '@resdir/console';
import {createClientError} from '@resdir/error';

import ValueResource from './value';

export class BooleanResource extends ValueResource {
  static $RESOURCE_TYPE = 'boolean';

  static $normalizeValue(value) {
    if (typeof value !== 'boolean') {
      throw createClientError('Invalid value type');
    }
    return value;
  }

  static $normalize(definition, options) {
    if (typeof definition === 'boolean') {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parseValue(str) {
    const originalString = str;
    str = str.toLowerCase();
    if (str === '1' || str === 'true' || str === 'yes' || str === 'on') {
      return true;
    }
    if (str === '0' || str === 'false' || str === 'no' || str === 'off') {
      return false;
    }
    throw createClientError(
      `Cannot convert a string to a boolean: ${formatString(originalString)}`
    );
  }
}

export default BooleanResource;
