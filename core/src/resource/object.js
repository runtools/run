import {isPlainObject, cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';

import ValueResource from './value';

export class ObjectResource extends ValueResource {
  static $RESOURCE_TYPE = 'object';

  static $normalizeValue(value) {
    if (!isPlainObject(value)) {
      throw new Error('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }

  static $normalize(definition, options) {
    if (
      isPlainObject(definition) &&
      definition['@type'] === undefined &&
      definition['@import'] === undefined &&
      definition['@implementation'] === undefined &&
      definition['@value'] === undefined
    ) {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }
}

export default ObjectResource;
