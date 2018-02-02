import {isPlainObject} from 'lodash';
import {takeProperty} from '@resdir/util';
import {formatCode, catchContext} from '@resdir/console';
import {createClientError} from '@resdir/error';

import Resource from '../resource';

export class PointerResource extends Resource {
  static $RESOURCE_TYPE = 'pointer';

  async $construct(definition, options) {
    definition = {...definition};

    const target = takeProperty(definition, '@target');

    await super.$construct(definition, options);

    catchContext(this, () => {
      if (target !== undefined) {
        this.$target = target;
      }
    });
  }

  get $target() {
    return this._getInheritedValue('_target');
  }

  set $target(target) {
    if (target !== undefined && !(target instanceof Resource)) {
      throw createClientError(`${formatCode('@target')} attribute must be a Resource`);
    }
    this._target = target;
  }

  $format() {
    if (this._target) {
      throw new Error('Cannot format a pointer resource');
    }
    return super.$format();
  }

  static $normalize(definition, options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      definition = {'@target': definition};
    }
    return super.$normalize(definition, options);
  }

  $serialize(options) {
    if (this._target) {
      throw new Error('Cannot serialize a pointer resource');
    }
    return super.$serialize(options);
  }
}

export default PointerResource;
