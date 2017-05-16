import {isPlainObject, isEmpty} from 'lodash';
import {setProperty, addContextToErrors, formatString, formatCode} from 'run-common';

import Resource from './';

export class ObjectResource extends Resource {
  constructor(definition = {}, options) {
    super(definition, options);

    this.$initialization = addContextToErrors(async () => {
      setProperty(this, definition, '$types', ['$type']);

      if (this.$types) {
        for (const type of this.$types) {
          const parent = await this._createParent(type);
          if (!parent) continue;
          this.$inherit(parent);
        }
      }

      for (const id of Object.keys(definition)) {
        if (id.startsWith('$')) continue;
        const value = definition[id];
        let property = this.$getProperty(id, {ignoreAliases: true});
        if (property) {
          // Property assignment
          property.$set(value);
        } else {
          // Property definition
          property = await this.constructor.$create(value, {id, directory: this.$getDirectory()});
          this.$addProperty(property);
        }
      }
    }).call(this);
  }

  $inherit(parent) {
    parent.$forEachProperty(property => {
      if (this.$getProperty(property.$id, {ignoreAliases: true})) {
        // Ignore duplicated properties
        return;
      }
      this.$addProperty(property.$instantiate());
    });
    super.$inherit(parent);
  }

  $get() {
    return this;
  }

  $set(value) {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
      throw new Error('Invalid value assigned to an ObjectResource');
    }
    Object.assign(this, value);
  }

  get $types() {
    return this._types;
  }

  set $types(types) {
    if (types !== undefined) {
      types = this.constructor.$normalizeTypes(types);
    }
    this._types = types;
  }

  async _createParent(type) {
    if (typeof type === 'string') {
      if (type === 'object') return;
      const specifier = type;
      return await this.constructor.$load(specifier, {directory: this.$getDirectory()});
    } else if (isPlainObject(type)) {
      const definition = type;
      return await this.constructor.$create(definition, {directory: this.$getDirectory()});
    }
    throw new Error(`Invalid ${formatCode('$type')} value`);
  }

  _properties = [];

  $addProperty(property: Resource) {
    this._properties.push(property);

    Object.defineProperty(this, property.$id, {
      get() {
        return property.$get();
      },
      set(value) {
        property.$set(value);
      }
    });
  }

  $forEachProperty(fn) {
    for (const property of this._properties) {
      const result = fn(property);
      if (result === false) break;
    }
  }

  $getProperty(name: string, {ignoreAliases} = {}) {
    let result;
    this.$forEachProperty(property => {
      if (property.$isMatching(name, {ignoreAliases})) {
        result = property;
        return false;
      }
    });
    return result;
  }

  $serialize(options) {
    let result = super.$serialize(options);

    if (result === undefined) {
      result = {};
    }

    const types = this._types;
    if (types !== undefined) {
      if (types.length === 1) {
        result.$type = types[0];
      } else if (types.length > 1) {
        result.$types = types;
      }
    }

    this.$forEachProperty(property => {
      const key = property.$id;
      const value = property.$serialize({omitId: true});
      if (value !== undefined) {
        result[key] = value;
      }
    });

    if (isEmpty(result)) {
      result = undefined;
    }

    return result;
  }
}
export default ObjectResource;
