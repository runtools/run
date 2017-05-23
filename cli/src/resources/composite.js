import {isPlainObject, isEmpty} from 'lodash';
import {getProperty, setProperty, addContextToErrors, formatCode} from 'run-common';

import Resource from './';
import Runtime from '../runtimes';

export class CompositeResource extends Resource {
  constructor(definition = {}, options) {
    super(definition, options);
    setProperty(this, definition, '$implementation');
    setProperty(this, definition, '$runtime');

    this.$initialization = addContextToErrors(async () => {
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

  static $getImplementationClass(definition, {directory} = {}) {
    const implementation = getProperty(definition, '$implementation');
    if (!implementation) return this;
    let runtime = getProperty(definition, '$runtime');
    if (!runtime) {
      throw new Error('An $implementation requires a $runtime');
    }
    runtime = Runtime.create(runtime);
    const classBuilder = runtime.require(implementation, {directory});
    return classBuilder(this);
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
      throw new Error('Invalid value assigned to an CompositeResource');
    }
    Object.assign(this, value);
  }

  get $implementation() {
    return this._implementation;
  }

  set $implementation(implementation: ?string) {
    this._implementation = implementation;
  }

  get $runtime() {
    return this._getProperty('_runtime');
  }

  set $runtime(runtime: ?(string | Runtime)) {
    if (typeof runtime === 'string') {
      runtime = Runtime.create(runtime);
    }
    this._runtime = runtime;
  }

  async _createParent(type) {
    if (typeof type === 'string') {
      if (type === 'composite') return;
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

    if (this._implementation !== undefined) {
      result.$implementation = this._implementation;
    }

    if (this._runtime !== undefined) {
      result.$runtime = this._runtime.toJSON();
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
export default CompositeResource;
