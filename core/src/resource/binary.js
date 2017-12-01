import ValueResource from './value';

const BASE64_PREFIX = 'data:;base64,';

export class BinaryResource extends ValueResource {
  static $RESOURCE_TYPE = 'binary';

  static $normalizeValue(value) {
    if (typeof value === 'string') {
      return this.$parse(value);
    } else if (Buffer.isBuffer(value)) {
      return value;
    }
    throw new Error('Invalid value type');
  }

  $serializeValue() {
    return this._value && BASE64_PREFIX + this._value.toString('base64');
  }

  static $normalize(definition, options) {
    if (typeof definition === 'string' || Buffer.isBuffer(definition)) {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parse(str) {
    if (str.startsWith(BASE64_PREFIX)) {
      str = str.slice(BASE64_PREFIX.length);
      const buffer = Buffer.from(str, 'base64');
      return buffer;
    }
    throw new Error(`Cannot convert a string to a binary`);
  }
}

export default BinaryResource;
