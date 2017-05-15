import {setProperty, addContextToErrors} from 'run-common';

import Resource from './';

export class ValueResource extends Resource {
  constructor(definition, options) {
    super(definition, options);
    addContextToErrors(() => {
      setProperty(this, definition, '$value');
    }).call(this);
  }

  $get() {
    return this.$value;
  }

  $set(value) {
    this.$value = value;
  }

  get $value() {
    return this._getProperty('_value');
  }

  set $value(value) {
    if (value !== undefined) {
      value = this.constructor.$normalizeValue(value);
    }
    this._value = value;
  }

  $serializeValue() {
    return this._value;
  }

  $serialize(options) {
    let result = super.$serialize(options);

    if (result === undefined) {
      result = {};
    }

    const serializedValue = this.$serializeValue();
    if (serializedValue !== undefined) {
      result.$value = serializedValue;
    }

    const keys = Object.keys(result);
    if (keys.length === 0) {
      result = undefined;
    } else if (keys.length === 1 && keys[0] === '$value') {
      result = result.$value;
    }

    return result;
  }
}

export default ValueResource;
