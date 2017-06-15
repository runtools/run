import {getProperty, addContextToErrors} from 'run-common';

import Resource from '../resource';

export class ValueResource extends Resource {
  constructor(definition, options) {
    super(definition, options);
    addContextToErrors(() => {
      const value = getProperty(definition, '$value');
      if (value !== undefined) {
        const parse = options && options.parse;
        this.$setValue(value, {parse});
      }
    }).call(this);
  }

  get $value() {
    return this.$getValue();
  }

  set $value(value) {
    this.$setValue(value);
  }

  $getValue() {
    return this._getProperty('_value');
  }

  $setValue(value, {parse} = {}) {
    if (value !== undefined) {
      if (typeof value === 'string' && parse) {
        const parser = this.constructor.$parseValue;
        if (parser) {
          value = parser(value);
        }
      }
      value = this.constructor.$normalizeValue(value);
    }
    this._value = value;
  }

  $unwrap() {
    return this.$getValue();
  }

  $wrap(value) {
    this.$setValue(value);
  }

  $serializeValue() {
    return this._value;
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    const serializedValue = this.$serializeValue();
    if (serializedValue !== undefined) {
      definition.$value = serializedValue;
    }

    const keys = Object.keys(definition);
    if (keys.length === 0) {
      definition = undefined;
    } else if (keys.length === 1 && keys[0] === '$value') {
      definition = definition.$value;
    } else if (keys.length === 2 && keys.includes('$type') && keys.includes('$value')) {
      definition = definition.$value;
    }

    return definition;
  }
}

export default ValueResource;
