import ValueResource from './value';
import {createClientError} from '@resdir/error';

const BASE64_PREFIX = 'data:;base64,';

export class BinaryResource extends ValueResource {
  static $RESOURCE_TYPE = 'binary';

  static $normalizeValue(value) {
    if (typeof value === 'string') {
      return this.$parseValue(value);
    }
    if (Buffer.isBuffer(value)) {
      return value;
    }
    throw createClientError('Invalid value type');
  }

  static $normalize(definition, options) {
    if (typeof definition === 'string' || Buffer.isBuffer(definition)) {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parseValue(str) {
    if (str.startsWith(BASE64_PREFIX)) {
      str = str.slice(BASE64_PREFIX.length);
      const buffer = Buffer.from(str, 'base64');
      return buffer;
    }
    throw createClientError(`Cannot convert a string to a binary`);
  }

  static $serializeValue(value) {
    return value && BASE64_PREFIX + value.toString('base64');
  }
}

export default BinaryResource;
