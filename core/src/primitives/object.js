import {isPlainObject, cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
import ValueResource from './value';

export class ObjectResource extends ValueResource {
  static $normalizeValue(value) {
    if (!isPlainObject(value)) {
      throw new Error('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }
}

export default ObjectResource;
