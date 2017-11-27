import {isPlainObject} from 'lodash';
import {takeProperty} from '@resdir/util';
import {catchContext} from '@resdir/console';

import Resource from '../resource';

export class ValueResource extends Resource {
  async $construct(definition, options) {
    definition = {...definition};

    const value = takeProperty(definition, '@value');

    await super.$construct(definition, options);

    catchContext(this, () => {
      if (value !== undefined) {
        this.$value = value;
      }
    });
  }

  get $value() {
    return this._getInheritedValue('_value');
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

  $defaultAutoBoxing = true;

  $box(value) {
    this.$value = value;
  }

  $defaultAutoUnboxing = true;

  $unbox() {
    return this.$value;
  }

  // async $invoke(expression = {arguments: [], options: {}}, {parent} = {}) {
  //   if (expression.arguments.length || !isEmpty(expression.options)) {
  //     throw new Error('A ValueResource cannot be invoked with arguments or options');
  //   }
  //   return this.$value;
  // }

  static $normalize(definition, options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      if (typeof definition === 'string' && options && options.parse) {
        definition = this.$parse(definition);
      }
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parse(str) {
    return str;
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    const serializedValue = this.$serializeValue();
    if (serializedValue !== undefined) {
      definition['@value'] = serializedValue;
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
