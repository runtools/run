import {dirname} from 'path';
import {isPlainObject, isEmpty} from 'lodash';
import {
  addContextToErrors,
  setProperty,
  getPropertyKeyAndValue,
  formatString,
  formatCode
} from 'run-common';

import {createResource, loadResource} from './';
import Version from './version';
import Runtime from './runtime';

export class Resource {
  constructor(definition: {} = {}, {parents = [], directory, file} = {}) {
    addContextToErrors(() => {
      if (directory !== undefined) this.$setDirectory(directory);
      if (file !== undefined) this.$setFile(file);

      setProperty(this, definition, '$name');
      setProperty(this, definition, '$aliases', ['$alias']);
      setProperty(this, definition, '$version');
      setProperty(this, definition, '$description');
      setProperty(this, definition, '$authors', ['$author']);
      setProperty(this, definition, '$repository');
      setProperty(this, definition, '$license');
      setProperty(this, definition, '$types', ['$type']);
      setProperty(this, definition, '$implementation');
      setProperty(this, definition, '$runtime');

      for (const parent of parents) {
        this.$inherit(parent);
      }

      for (const name of Object.keys(definition)) {
        if (name.startsWith('$')) continue;
        this.$setProperty(name, definition[name], {ignoreAliases: true});
      }
    }).call(this);
  }

  _parents = [];

  $inherit(parent) {
    this._parents.push(parent);
    parent.$forEachProperty(property => {
      this.$setProperty(property.$name, undefined, {ignoreAliases: true});
    });
  }

  $instantiate() {
    const instance = new this.constructor();
    instance.$inherit(this);
    return instance;
  }

  static $normalizeTypes(types) {
    if (types === undefined) {
      types = [];
    } else if (typeof types === 'string' || isPlainObject(types)) {
      types = [types];
    } else if (!Array.isArray(types)) {
      throw new Error(`Invalid ${formatCode('$type')} value`);
    }
    return types;
  }

  $forSelfAndEachParent(fn, {skipSelf, deepSearch} = {}) {
    const resources = [this];
    let isSelf = true;
    while (resources.length) {
      const resource = resources.shift();
      if (!(isSelf && skipSelf)) {
        const result = fn(resource);
        if (result === false) break;
      }
      if (isSelf || deepSearch) {
        resources.push(...resource._parents);
      }
      isSelf = false;
    }
  }

  $forEachParent(fn, {deepSearch} = {}) {
    this.$forSelfAndEachParent(fn, {skipSelf: true, deepSearch});
  }

  $findParent(fn) {
    let result;
    this.$forEachParent(
      parent => {
        if (fn(parent)) {
          result = parent;
          return false; // Break forEachParent loop
        }
      },
      {deepSearch: true}
    );
    return result;
  }

  $isInstanceOf(resource) {
    return Boolean(this.$findParent(parent => parent === resource));
  }

  _getProperty(name) {
    let result;
    this.$forSelfAndEachParent(
      resource => {
        if (name in resource) {
          result = resource[name];
          return false;
        }
      },
      {deepSearch: true}
    );
    return result;
  }

  $getFile() {
    return this.__file;
  }

  $setFile(file) {
    this.__file = file;
  }

  $getDirectory() {
    return this.__directory || (this.$getFile() && dirname(this.$getFile()));
  }

  $setDirectory(directory) {
    this.__directory = directory;
  }

  get $name() {
    return this._getProperty('_name');
  }

  set $name(name: ?string) {
    if (name !== undefined) {
      if (!this.$validateName(name)) {
        throw new Error(`Resource name ${formatString(name)} is invalid`);
      }
    }
    this._name = name;
  }

  $getScope() {
    const name = this.$name;
    if (!name) return undefined;
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return undefined;
    }
    return scope;
  }

  $getIdentifier() {
    const name = this.$name;
    if (!name) return undefined;
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return scope;
    }
    return identifier;
  }

  $validateName(name: string) {
    let [scope, identifier, rest] = name.split('/');

    if (scope && identifier === undefined) {
      identifier = scope;
      scope = undefined;
    }

    if (scope !== undefined && !this.$validateNamePart(scope)) {
      return false;
    }

    if (!this.$validateNamePart(identifier)) {
      return false;
    }

    if (rest) {
      return false;
    }

    return true;
  }

  $validateNamePart(part: string) {
    if (!part) {
      return false;
    }

    if (/[^a-z0-9._-]/i.test(part)) {
      return false;
    }

    if (/[^a-z0-9]/i.test(part[0] + part[part.length - 1])) {
      return false;
    }

    return true;
  }

  get $aliases() {
    return this._getProperty('_aliases');
  }

  set $aliases(aliases: ?(Array | string)) {
    this._aliases = undefined;
    if (aliases) {
      if (typeof aliases === 'string') {
        aliases = [aliases];
      }
      for (const alias of aliases) {
        this.$addAlias(alias);
      }
    }
  }

  $addAlias(alias: string) {
    if (!this._aliases) {
      this._aliases = new Set();
    }
    this._aliases.add(alias);
  }

  $hasAlias(alias: string) {
    const aliases = this.$aliases;
    return Boolean(aliases && aliases.has(alias));
  }

  $isMatching(name: string, {ignoreAliases} = {}) {
    return this.$name === name || (!ignoreAliases && this.$hasAlias(name));
  }

  $match(object) {
    return getPropertyKeyAndValue(object, this.$name, this.$aliases);
  }

  get $version() {
    return this._getProperty('_version');
  }

  set $version(version: ?(string | Version)) {
    if (typeof version === 'string') {
      version = new Version(version);
    }
    this._version = version;
  }

  get $description() {
    return this._getProperty('_description');
  }

  set $description(description: ?string) {
    this._description = description;
  }

  get $authors() {
    return this._getProperty('_authors');
  }

  set $authors(authors: ?(Array<string> | string)) {
    if (typeof authors === 'string') {
      authors = [authors];
    }
    this._authors = authors;
  }

  get $repository() {
    return this._getProperty('_repository');
  }

  set $repository(repository: ?string) {
    this._repository = repository;
  }

  get $license() {
    return this._getProperty('_license');
  }

  set $license(license: ?string) {
    this._license = license;
  }

  get $types() {
    return this._types;
  }

  set $types(types) {
    if (types !== undefined) {
      types = Resource.$normalizeTypes(types);
    }
    this._types = types;
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
      runtime = new Runtime(runtime);
    }
    this._runtime = runtime;
  }

  _properties = [];

  $forEachProperty(fn) {
    for (let i = 0; i < this._properties.length; i++) {
      const property = this._properties[i];
      const result = fn(property, i);
      if (result === false) break;
    }
  }

  // Alias: $get
  $getProperty(name, {ignoreAliases} = {}) {
    let result;
    this.$forEachProperty(property => {
      if (property.$isMatching(name, {ignoreAliases})) {
        result = property;
        return false;
      }
    });
    return result;
  }

  $getPropertyFromParents(name, {ignoreAliases} = {}) {
    let result;
    this.$forEachParent(parent => {
      result = parent.$getProperty(name, {ignoreAliases});
      if (result) return false;
    });
    return result;
  }

  // Alias: $set
  $setProperty(name, definition, {ignoreAliases} = {}) {
    this.$removeProperty(name, {ignoreAliases});

    let property = this.$getPropertyFromParents(name, {ignoreAliases});
    const parents = property ? [property] : undefined;
    property = createResource(definition, {
      parents,
      name,
      directory: this.$getDirectory(),
      owner: this
    });

    this._properties.push(property);

    // const owner = this;
    Object.defineProperty(this, name, {
      get() {
        const unwrapper = property.$unwrap;
        return unwrapper ? unwrapper.call(property) : property;
      },
      set(value) {
        const wrapper = property.$wrap;
        if (wrapper) {
          wrapper.call(property, value);
        } else {
          throw new Error('Unimplemented');
        }
      },
      configurable: true
    });
  }

  $removeProperty(name, {ignoreAliases} = {}) {
    this.$forEachProperty((property, index) => {
      if (property.$isMatching(name, {ignoreAliases})) {
        this._properties.splice(index, 1);
        return false;
      }
    });
  }

  static $normalize(definition, _options) {
    return definition;
  }

  $serialize({omitName} = {}) {
    let definition = {};

    if (!omitName && this._name !== undefined) {
      definition.$name = this._name;
    }

    let aliases = this._aliases;
    if (aliases !== undefined) {
      aliases = Array.from(aliases);
      if (aliases.length === 1) {
        definition.$alias = aliases[0];
      } else if (aliases.length > 1) {
        definition.$aliases = aliases;
      }
    }

    if (this._version !== undefined) {
      definition.$version = this._version.toJSON();
    }

    if (this._description !== undefined) {
      definition.$description = this._description;
    }

    const authors = this._authors;
    if (authors !== undefined) {
      if (authors.length === 1) {
        definition.$author = authors[0];
      } else if (authors.length > 1) {
        definition.$authors = authors;
      }
    }

    if (this._repository !== undefined) {
      definition.$repository = this._repository;
    }

    if (this._license !== undefined) {
      definition.$license = this._license;
    }

    const types = this._types;
    if (types !== undefined) {
      if (types.length === 1) {
        definition.$type = types[0];
      } else if (types.length > 1) {
        definition.$types = types;
      }
    }

    if (this._implementation !== undefined) {
      definition.$implementation = this._implementation;
    }

    if (this._runtime !== undefined) {
      definition.$runtime = this._runtime.toJSON();
    }

    this.$forEachProperty(property => {
      const propertyDefinition = property.$serialize({omitName: true});
      if (propertyDefinition !== undefined) {
        const name = property.$name;
        definition[name] = propertyDefinition;
      }
    });

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

// Convenient reference to core functions
Resource.core = {createResource, loadResource};

// Aliases
Resource.prototype.$get = Resource.prototype.$getProperty;
Resource.prototype.$set = Resource.prototype.$setProperty;

export default Resource;
