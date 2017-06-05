import {dirname} from 'path';
import {isPlainObject, isEmpty} from 'lodash';
import {addContextToErrors, setProperty, formatString, formatCode} from 'run-common';

import Version from '../version';

export class BaseResource {
  constructor(definition: {} = {}, {directory, file} = {}) {
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
    }).call(this);
  }

  $addInitializer(initializer) {
    if (!this._initializers) {
      this._initializers = [];
    }
    this._initializers.push(initializer);
  }

  async $completeInitialization() {
    if (this._initializers) {
      await Promise.all(this._initializers);
    }
  }

  static $getImplementationClass(_definition, _options) {
    return this;
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

  $instantiate(value, {parse} = {}) {
    const instance = new this.constructor();
    instance.$inherit(this);
    if (value !== undefined) {
      instance.$set(value, {parse});
    }
    return instance;
  }

  _parents = [];

  $inherit(parent) {
    this._parents.push(parent);
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
      types = BaseResource.$normalizeTypes(types);
    }
    this._types = types;
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

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

export default BaseResource;
