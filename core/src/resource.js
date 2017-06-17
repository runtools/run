import {join, resolve, basename, dirname, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {isPlainObject, isEmpty} from 'lodash';
import isDirectory from 'is-directory';
import {
  addContextToErrors,
  getProperty,
  setProperty,
  getPropertyKeyAndValue,
  loadFile,
  formatString,
  formatPath,
  formatCode
} from 'run-common';

const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const RESOURCE_FILE_NAME = 'resource';

import {getPrimitiveResourceClass} from './primitives';
import Version from './version';
import Runtime from './runtime';

export class Resource {
  constructor(definition = {}, {parents = [], owner, name, directory, file} = {}) {
    addContextToErrors(() => {
      if (owner !== undefined) this.$setOwner(owner);
      if (directory !== undefined) this.$setDirectory(directory);
      if (file !== undefined) this.$setFile(file);
      if (name !== undefined) this.$name = name;

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
        this._inherit(parent);
      }

      for (const name of Object.keys(definition)) {
        if (name.startsWith('$')) continue;
        this.$setProperty(name, definition[name], {ignoreAliases: true});
      }
    }).call(this);
  }

  static $create(definition = {}, {parents = [], owner, name, directory, file, parse} = {}) {
    let normalizedDefinition;
    if (isPlainObject(definition)) {
      normalizedDefinition = definition;
    } else {
      normalizedDefinition = {};
      if (definition !== undefined) {
        normalizedDefinition.$value = definition;
      }
    }

    let types = getProperty(normalizedDefinition, '$types', ['$type']);
    types = Resource.$normalizeTypes(types);
    if (
      this === Resource &&
      types.length === 0 &&
      parents.length === 0 &&
      normalizedDefinition.$value !== undefined
    ) {
      types = [inferType(normalizedDefinition.$value)];
    }

    const dir = directory || (file && dirname(file));

    const parentsClasses = [this];
    const actualParents = [...parents];

    for (const type of types) {
      if (typeof type === 'string') {
        if (type === 'resource') continue;
        const Class = getPrimitiveResourceClass(type);
        if (Class) {
          parentsClasses.push(Class);
        } else {
          const parent = Resource.$load(type, {directory: dir});
          actualParents.push(parent);
        }
      } else if (isPlainObject(type)) {
        const parent = Resource.$create(type, {directory: dir});
        actualParents.push(parent);
      } else {
        throw new Error("A 'type' must be a string or a plain object");
      }
    }

    for (const parent of actualParents) {
      parentsClasses.push(parent.constructor);
    }

    let ResourceClass = Resource;
    for (const Class of parentsClasses) {
      if (Object.prototype.isPrototypeOf.call(ResourceClass, Class)) {
        ResourceClass = Class;
      } else if (
        ResourceClass === Class ||
        Object.prototype.isPrototypeOf.call(Class, ResourceClass)
      ) {
        // NOOP
      } else {
        throw new Error(`Can't mix a ${ResourceClass.name} with a ${Class.name}`);
      }
    }

    const implementation = getProperty(normalizedDefinition, '$implementation');
    if (implementation) {
      const classBuilder = requireImplementation(implementation, {directory: dir});
      ResourceClass = classBuilder(ResourceClass);
    }

    normalizedDefinition = ResourceClass.$normalize(definition, {parse});

    return new ResourceClass(normalizedDefinition, {
      parents: actualParents,
      owner,
      name,
      directory,
      file,
      parse
    });
  }

  static $load(
    specifier: string,
    {directory, searchInParentDirectories, throwIfNotFound = true} = {}
  ) {
    let file;

    if (specifier.startsWith('.')) {
      if (!directory) {
        throw new Error("'directory' argument is missing");
      }
      file = resolve(directory, specifier);
    } else if (isAbsolute(specifier)) {
      file = specifier;
    } else {
      throw new Error(`Loading from Resdir is not yet implemented (${formatString(specifier)})`);
    }

    file = searchResourceFile(file, {searchInParentDirectories});
    if (!file) {
      if (throwIfNotFound) {
        throw new Error(`Resource not found: ${formatPath(specifier)}`);
      }
      return undefined;
    }

    const definition = loadFile(file, {parse: true});

    return this.$create(definition, {file});
  }

  _parents = [];

  _inherit(parent) {
    this._parents.push(parent);
    parent.$forEachProperty(property => {
      this.$setProperty(property.$name, undefined, {ignoreAliases: true});
    });
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

  $instantiate(definition, {parse} = {}) {
    return this.constructor.$create(definition, {parents: [this], parse});
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

  $getOwner() {
    return this.__owner;
  }

  $setOwner(owner) {
    this.__owner = owner;
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
    property = Resource.$create(definition, {
      parents,
      name,
      directory: this.$getDirectory(),
      owner: this
    });

    this._properties.push(property);

    Object.defineProperty(this, name, {
      get() {
        return property.$unwrap();
      },
      set(value) {
        property.$wrap(value);
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

  $unwrap() {
    return this;
  }

  $wrap(value) {
    const owner = this.$getOwner();
    if (!owner) {
      throw new Error("Can't wrap a property without an 'owner'");
    }

    const name = this.$name;
    if (!name) {
      throw new Error("Can't wrap a property without a '$name'");
    }

    owner.$setProperty(name, value, {ignoreAliases: true});
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

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw new Error('Invalid resource definition');
    }
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

Resource.prototype.$get = Resource.prototype.$getProperty;
Resource.prototype.$set = Resource.prototype.$setProperty;

function searchResourceFile(directoryOrFile, {searchInParentDirectories = false} = {}) {
  let directory;

  if (isDirectory.sync(directoryOrFile)) {
    directory = directoryOrFile;
  }

  if (!directory) {
    if (existsSync(directoryOrFile)) {
      const file = directoryOrFile;
      const filename = basename(file);
      if (RESOURCE_FILE_FORMATS.find(format => filename === RESOURCE_FILE_NAME + '.' + format)) {
        return file;
      }
    }
    return undefined;
  }

  for (const format of RESOURCE_FILE_FORMATS) {
    const file = join(directory, RESOURCE_FILE_NAME + '.' + format);
    if (existsSync(file)) {
      return file;
    }
  }

  if (searchInParentDirectories) {
    const parentDirectory = join(directory, '..');
    if (parentDirectory !== directory) {
      return searchResourceFile(parentDirectory, {searchInParentDirectories});
    }
  }

  return undefined;
}

function inferType(value) {
  if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (typeof value === 'string') {
    return 'string';
  } else if (Array.isArray(value)) {
    return 'array';
  } else if (isPlainObject(value)) {
    return 'object';
  }
  throw new Error('Cannot infer the type from $value');
}

function requireImplementation(implementationFile, {directory} = {}) {
  let file = implementationFile;
  if (!isAbsolute(file) && directory) {
    file = resolve(directory, file);
  }
  file = searchImplementationFile(file);
  if (!file) {
    throw new Error(`File not found: ${formatPath(implementationFile)}`);
  }
  const result = require(file);
  return result.default || result;
}

function searchImplementationFile(file) {
  if (isDirectory.sync(file)) {
    const dir = file;
    const mainFile = join(dir, 'index.js');
    if (existsSync(mainFile)) {
      return mainFile;
    }
  } else {
    if (existsSync(file)) {
      return file;
    }
    const fileWithExtension = file + '.js';
    if (existsSync(fileWithExtension)) {
      return fileWithExtension;
    }
  }
  return undefined;
}

export default Resource;
