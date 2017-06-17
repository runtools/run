import {isPlainObject, cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
// import JSON5 from 'json5';
// import {formatString} from 'run-common';

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

  // static $parse(str) {
  //   let object;
  //   try {
  //     object = JSON5.parse(str);
  //   } catch (err) {
  //     // NOOP
  //   }
  //   if (!isPlainObject(object)) {
  //     throw new Error(`Cannot convert a string to an object: ${formatString(str)}`);
  //   }
  //   return object;
  // }
}

export default ObjectResource;
