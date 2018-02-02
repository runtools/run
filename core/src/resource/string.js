import ValueResource from './value';
import {createClientError} from '@resdir/error';

export class StringResource extends ValueResource {
  static $RESOURCE_TYPE = 'string';

  static $normalizeValue(value) {
    if (typeof value !== 'string') {
      throw createClientError('Invalid value type');
    }
    return value;
  }

  static $normalize(definition, options) {
    if (typeof definition === 'string') {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }
}

export default StringResource;
