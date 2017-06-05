import {isPlainObject, isEmpty} from 'lodash';
import {getProperty, setProperty, addContextToErrors, formatCode} from 'run-common';

import {createResource, loadResource} from './';
import BaseResource from './base';
import {createRuntime} from '../runtimes';

export class CompositeResource extends BaseResource {
  constructor(definition = {}, options) {
    super(definition, options);
    setProperty(this, definition, '$implementation');
    setProperty(this, definition, '$runtime');

    this.$addInitializer(
      addContextToErrors(async () => {
        if (this.$types) {
          for (const type of this.$types) {
            const parent = await this._createParent(type);
            if (!parent) continue;
            this.$inherit(parent);
          }
        }

        for (const name of Object.keys(definition)) {
          if (name.startsWith('$')) continue;
          const value = definition[name];
          let property = this.$getProperty(name, {ignoreAliases: true});
          if (property) {
            // Property assignment
            property.$set(value);
          } else {
            // Property definition
            property = await createResource(value, {
              name,
              directory: this.$getDirectory(),
              owner: this
            });
            this.$addProperty(property);
          }
        }
      }).call(this)
    );
  }

  static $getImplementationClass(definition, {directory} = {}) {
    const implementation = getProperty(definition, '$implementation');
    if (!implementation) return this;
    let runtime = getProperty(definition, '$runtime');
    if (!runtime) {
      throw new Error('An $implementation requires a $runtime');
    }
    runtime = createRuntime(runtime);
    const classBuilder = runtime.require(implementation, {directory});
    return classBuilder(this);
  }

  $inherit(parent) {
    parent.$forEachProperty(property => {
      if (this.$getProperty(property.$name, {ignoreAliases: true})) {
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

  $set(definition) {
    if (definition === undefined) return;
    definition = this.constructor.$normalize(definition);
    if (!isPlainObject(definition)) {
      throw new Error('Invalid definition assigned to a CompositeResource');
    }
    Object.assign(this, definition);
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

  set $runtime(runtime) {
    if (typeof runtime === 'string') {
      runtime = createRuntime(runtime);
    }
    this._runtime = runtime;
  }

  async _createParent(type) {
    if (typeof type === 'string') {
      if (type === 'composite' || type === 'tool') return; // TODO: Improve this
      const specifier = type;
      return await loadResource(specifier, {directory: this.$getDirectory()});
    } else if (isPlainObject(type)) {
      const definition = type;
      return await createResource(definition, {directory: this.$getDirectory()});
    }
    throw new Error(`Invalid ${formatCode('$type')} value`);
  }

  _properties = [];

  $addProperty(property: BaseResource) {
    this._properties.push(property);

    Object.defineProperty(this, property.$name, {
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

  async $invoke(expression) {
    expression = {...expression, arguments: [...expression.arguments]};
    const name = expression.arguments.shift();
    if (!name) return this;

    const property = this.$getProperty(name);
    if (!property) {
      throw new Error(`Property not found: ${formatCode(name)}`);
    }

    return await property.$invoke(expression, {owner: this});
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    if (this._implementation !== undefined) {
      definition.$implementation = this._implementation;
    }

    if (this._runtime !== undefined) {
      definition.$runtime = this._runtime.toJSON();
    }

    this.$forEachProperty(property => {
      const key = property.$name;
      const value = property.$serialize({omitName: true});
      if (value !== undefined) {
        definition[key] = value;
      }
    });

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}
export default CompositeResource;
