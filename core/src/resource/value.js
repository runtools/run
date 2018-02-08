import {isPlainObject} from 'lodash';
import {takeProperty} from '@resdir/util';
import {formatValue, catchContext} from '@resdir/console';

import Resource from '../resource';

export class ValueResource extends Resource {
  async $construct(definition, options) {
    definition = {...definition};

    const value = takeProperty(definition, '@value');
    const defaultValue = takeProperty(definition, '@default');

    await super.$construct(definition, options);

    catchContext(this, () => {
      if (value !== undefined) {
        this.$value = value;
      }
      if (defaultValue !== undefined) {
        this.$default = defaultValue;
      }
    });
  }

  get $value() {
    let value = this._$getInheritedValue('_$value');
    if (value === undefined) {
      value = this.$default;
    }
    return value;
  }

  set $value(value) {
    if (value !== undefined) {
      value = this.constructor.$normalizeValue(value);
    }
    this._$value = value;
  }

  get $default() {
    return this._$getInheritedValue('_$default');
  }

  set $default(defaultValue) {
    if (defaultValue !== undefined) {
      defaultValue = this.constructor.$normalizeValue(defaultValue);
    }
    this._$default = defaultValue;
  }

  $defaultAutoBoxing = true;

  $box(value) {
    this.$value = value;
  }

  $defaultAutoUnboxing = true;

  $unbox() {
    return this.$value;
  }

  $format() {
    return formatValue(this.$value);
  }

  static $normalize(definition, options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      if (typeof definition === 'string' && options && options.parse) {
        definition = this.$parseValue(definition);
      }
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parseValue(str) {
    return str;
  }

  static $serializeValue(value) {
    return value;
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    const serializedValue = this.constructor.$serializeValue(this._$value);
    if (serializedValue !== undefined) {
      definition['@value'] = serializedValue;
    }

    const serializedDefault = this.constructor.$serializeValue(this._$default);
    if (serializedDefault !== undefined) {
      definition['@default'] = serializedDefault;
    }

    const keys = Object.keys(definition);
    if (keys.length === 0) {
      definition = undefined;
    } else if (keys.length === 1 && keys[0] === '@value') {
      definition = definition['@value'];
    }

    return definition;
  }
}

export default ValueResource;
