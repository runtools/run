import {join, resolve, relative, basename, dirname, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {homedir} from 'os';
import {isPlainObject, isEmpty} from 'lodash';
import isDirectory from 'is-directory';
import {copy, emptyDir} from 'fs-extra';
import {
  addContextToErrors,
  getProperty,
  setProperty,
  getPropertyKeyAndValue,
  loadFile,
  saveFile,
  task,
  formatString,
  formatPath,
  formatCode
} from 'run-common';
import {installPackage, PACKAGE_FILENAME} from '@resdir/package-manager';

const RESOURCE_FILE_NAME = '$resource';
const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json5';

const RUN_DIRECTORY = join(homedir(), '.run');
const PUBLISHED_RESOURCES_DIRECTORY = join(RUN_DIRECTORY, 'published-resources');
// const INSTALLED_RESOURCES_DIRECTORY = join(RUN_DIRECTORY, 'installed-resources');
const INSTALLED_RESOURCES_DIRECTORY = PUBLISHED_RESOURCES_DIRECTORY;

import {getPrimitiveResourceClass} from './primitives';
import Version from './version';
import Runtime from './runtime';

export class Resource {
  constructor(definition = {}, {bases = [], parent, name, directory, file} = {}) {
    addContextToErrors(() => {
      if (parent !== undefined) {
        this.$setParent(parent);
      }
      if (directory !== undefined) {
        this.$setDirectory(directory);
      }
      if (file !== undefined) {
        this.$setFile(file);
      }
      if (name !== undefined) {
        this.$name = name;
      }

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
      setProperty(this, definition, '$files');

      for (const base of bases) {
        this._inherit(base);
      }

      for (const name of Object.keys(definition)) {
        if (name.startsWith('$')) {
          continue;
        }
        this.$setChild(name, definition[name], {ignoreAliases: true});
      }

      const exportDefinition = getProperty(definition, '$export', ['$exports']);
      if (exportDefinition !== undefined) {
        const resource = this.constructor.$create(exportDefinition, {
          directory: this.$getDirectory()
        });
        this.$setExport(resource);
      }
    }).call(this);
  }

  static $create(
    definition = {},
    {bases = [], parent, name, directory, file, importing, parse} = {}
  ) {
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
      bases.length === 0 &&
      normalizedDefinition.$value !== undefined
    ) {
      types = [inferType(normalizedDefinition.$value)];
    }

    const dir = directory || (file && dirname(file));

    const basesClasses = [this];
    const actualBases = [...bases];

    for (const type of types) {
      if (typeof type === 'string') {
        if (type === 'resource') {
          continue;
        }
        const Class = getPrimitiveResourceClass(type);
        if (Class) {
          basesClasses.push(Class);
        } else {
          const base = Resource.$import(type, {directory: dir});
          actualBases.push(base);
        }
      } else if (isPlainObject(type)) {
        const base = Resource.$create(type, {directory: dir, importing: true});
        actualBases.push(base);
      } else {
        throw new Error('A \'type\' must be a string or a plain object');
      }
    }

    for (const base of actualBases) {
      basesClasses.push(base.constructor);
    }

    let ResourceClass = Resource;
    for (const Class of basesClasses) {
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

    let resource = new ResourceClass(normalizedDefinition, {
      bases: actualBases,
      parent,
      name,
      directory,
      file,
      parse
    });

    if (importing) {
      resource = resource.$getExport();
      if (!resource) {
        throw new Error('Can\'t import a resource without an $export property');
      }
    }

    return resource;
  }

  static $load(
    specifier,
    {directory, importing, searchInParentDirectories, throwIfNotFound = true} = {}
  ) {
    let file;

    if (specifier.startsWith('.')) {
      if (!directory) {
        throw new Error('\'directory\' argument is missing');
      }
      file = resolve(directory, specifier);
    } else if (isAbsolute(specifier)) {
      file = specifier;
    } else {
      // TODO: load resources from Resdir
      // FIXME: Don't hardcode path separators
      file = INSTALLED_RESOURCES_DIRECTORY + '/' + specifier;
    }

    file = searchResourceFile(file, {searchInParentDirectories});
    if (!file) {
      if (throwIfNotFound) {
        throw new Error(`Resource not found: ${formatPath(specifier)}`);
      }
      return undefined;
    }

    const definition = loadFile(file, {parse: true});

    return this.$create(definition, {file, importing});
  }

  static $import(specifier, {directory} = {}) {
    return this.$load(specifier, {directory, importing: true});
  }

  $save(directory) {
    if (!this.$isRoot()) {
      throw new Error('Can\'t $save() a child resource');
    }

    if (directory) {
      this.$setDirectory(directory);
    }

    let file = this.$getFile();
    if (!file) {
      const directory = this.$getDirectory({throwIfUndefined: true});
      file = join(directory, RESOURCE_FILE_NAME + '.' + DEFAULT_RESOURCE_FILE_FORMAT);
      this.$setFile(file);
    }

    let definition = this.$serialize();
    if (definition === undefined) {
      definition = {};
    }

    saveFile(file, definition, {stringify: true});
  }

  _bases = [];

  _inherit(base) {
    this._bases.push(base);
    base.$forEachChild(child => {
      this.$setChild(child.$name, undefined, {ignoreAliases: true});
    });
  }

  $forSelfAndEachBase(fn, {skipSelf, deepSearch} = {}) {
    const resources = [this];
    let isSelf = true;
    while (resources.length) {
      const resource = resources.shift();
      if (!(isSelf && skipSelf)) {
        const result = fn(resource);
        if (result === false) {
          break;
        }
      }
      if (isSelf || deepSearch) {
        resources.push(...resource._bases);
      }
      isSelf = false;
    }
  }

  $forEachBase(fn, {deepSearch} = {}) {
    this.$forSelfAndEachBase(fn, {skipSelf: true, deepSearch});
  }

  $findBase(fn) {
    let result;
    this.$forEachBase(
      base => {
        if (fn(base)) {
          result = base;
          return false; // Break forEachBase loop
        }
      },
      {deepSearch: true}
    );
    return result;
  }

  $create(definition, options) {
    return this.constructor.$create(definition, {...options, bases: [this]});
  }

  $isInstanceOf(resource) {
    return Boolean(this.$findBase(base => base === resource));
  }

  _getChild(name) {
    let result;
    this.$forSelfAndEachBase(
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

  $getParent() {
    return this._parent;
  }

  $setParent(parent) {
    this._parent = parent;
  }

  $getRoot() {
    let resource = this;
    while (true) {
      const parent = resource.$getParent();
      if (!parent) {
        return resource;
      }
      resource = parent;
    }
  }

  $isRoot() {
    return !this.$getParent();
  }

  $getFile() {
    return this._file;
  }

  $setFile(file) {
    this._file = file;
  }

  $getDirectory({throwIfUndefined} = {}) {
    const directory = this._directory || (this.$getFile() && dirname(this.$getFile()));
    if (!directory && throwIfUndefined) {
      throw new Error('Resource\'s directory is undefined');
    }
    return directory;
  }

  $setDirectory(directory) {
    if (directory !== this._directory) {
      this._directory = directory;
      this._file = undefined;
    }
  }

  get $name() {
    return this._name;
  }

  set $name(name) {
    if (name !== undefined) {
      if (!this.$validateName(name)) {
        throw new Error(`Resource name ${formatString(name)} is invalid`);
      }
    }
    this._name = name;
  }

  $getScope() {
    const name = this.$name;
    if (!name) {
      return undefined;
    }
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return undefined;
    }
    return scope;
  }

  $getIdentifier() {
    const name = this.$name;
    if (!name) {
      return undefined;
    }
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return scope;
    }
    return identifier;
  }

  $validateName(name) {
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

  $validateNamePart(part) {
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
    return this._getChild('_aliases');
  }

  set $aliases(aliases) {
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

  $addAlias(alias) {
    if (!this._aliases) {
      this._aliases = new Set();
    }
    this._aliases.add(alias);
  }

  $hasAlias(alias) {
    const aliases = this.$aliases;
    return Boolean(aliases && aliases.has(alias));
  }

  $isMatching(name, {ignoreAliases} = {}) {
    return this.$name === name || (!ignoreAliases && this.$hasAlias(name));
  }

  $match(object) {
    return getPropertyKeyAndValue(object, this.$name, this.$aliases);
  }

  get $version() {
    return this._version;
  }

  set $version(version) {
    if (typeof version === 'string') {
      version = new Version(version);
    }
    this._version = version;
  }

  get $description() {
    return this._getChild('_description');
  }

  set $description(description) {
    this._description = description;
  }

  get $authors() {
    return this._authors;
  }

  set $authors(authors) {
    if (typeof authors === 'string') {
      authors = [authors];
    }
    this._authors = authors;
  }

  get $repository() {
    return this._repository;
  }

  set $repository(repository) {
    this._repository = repository;
  }

  get $license() {
    return this._license;
  }

  set $license(license) {
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

  set $implementation(implementation) {
    this._implementation = implementation;
  }

  get $runtime() {
    return this._getChild('_runtime');
  }

  set $runtime(runtime) {
    if (typeof runtime === 'string') {
      runtime = new Runtime(runtime);
    }
    this._runtime = runtime;
  }

  get $files() {
    return this._files;
  }

  set $files(files) {
    if (typeof files === 'string') {
      files = [files];
    }
    this._files = files;
  }

  $getExport() {
    return this._export;
  }

  $setExport(resource) {
    this._export = resource;
  }

  _children = [];

  $forEachChild(fn) {
    for (let i = 0; i < this._children.length; i++) {
      const child = this._children[i];
      const result = fn(child, i);
      if (result === false) {
        break;
      }
    }
  }

  // Alias: $get
  $getChild(name, {ignoreAliases} = {}) {
    let result;
    this.$forEachChild(child => {
      if (child.$isMatching(name, {ignoreAliases})) {
        result = child;
        return false;
      }
    });
    return result;
  }

  $getChildFromBases(name, {ignoreAliases} = {}) {
    let result;
    this.$forEachBase(base => {
      result = base.$getChild(name, {ignoreAliases});
      if (result) {
        return false;
      }
    });
    return result;
  }

  // Alias: $set
  $setChild(name, definition, {ignoreAliases} = {}) {
    const removedChildIndex = this.$removeChild(name, {ignoreAliases});

    let child = this.$getChildFromBases(name, {ignoreAliases});
    const bases = child ? [child] : undefined;
    child = Resource.$create(definition, {
      bases,
      name,
      directory: this.$getDirectory(),
      parent: this
    });

    if (removedChildIndex !== undefined) {
      // Try to not change the order of children
      this._children.splice(removedChildIndex, 0, child);
    } else {
      this._children.push(child);
    }

    Object.defineProperty(this, name, {
      get() {
        return child.$unwrap();
      },
      set(value) {
        child.$wrap(value);
      },
      configurable: true
    });
  }

  $removeChild(name, {ignoreAliases} = {}) {
    let result;
    this.$forEachChild((child, index) => {
      if (child.$isMatching(name, {ignoreAliases})) {
        this._children.splice(index, 1);
        result = index;
        return false;
      }
    });
    return result;
  }

  $unwrap() {
    return this;
  }

  $wrap(value) {
    const parent = this.$getParent();
    if (!parent) {
      throw new Error('Can\'t wrap a child without a parent');
    }

    const name = this.$name;
    if (!name) {
      throw new Error('Can\'t wrap a child without a \'$name\'');
    }

    parent.$setChild(name, value, {ignoreAliases: true});
  }

  async $invoke(expression) {
    expression = {...expression, arguments: [...expression.arguments]};
    const name = expression.arguments.shift();
    if (!name) {
      return this;
    }

    if (name === '$publish') {
      return await this.$publish();
    }

    const child = this.$getChild(name);
    if (!child) {
      throw new Error(`Child not found: ${formatCode(name)}`);
    }

    return await child.$invoke(expression, {parent: this});
  }

  async $publish() {
    const name = this.$name;
    if (!name) {
      throw new Error(`Can't publish a resource without a ${formatCode('$name')} property`);
    }

    await task(
      async () => {
        const scope = this.$getScope();
        if (!scope) {
          throw new Error(`Can't publish a resource with a unscoped ${formatCode('$name')}`);
        }

        const identifier = this.$getIdentifier();

        if (!this.$version) {
          throw new Error(`Can't publish a resource without a ${formatCode('$version')} property`);
        }

        const resourceFile = this.$getFile();
        if (!resourceFile) {
          throw new Error(`Can't publish a resource without a ${formatPath('$resource')} file`);
        }

        const srcDirectory = this.$getDirectory({throwIfUndefined: true});

        const srcFiles = [resourceFile];
        let hasPackageFile;
        if (this.$files) {
          for (const file of this.$files) {
            if (file === PACKAGE_FILENAME) {
              hasPackageFile = true;
            }
            srcFiles.push(resolve(srcDirectory, file));
          }
        }

        const destDirectory = join(PUBLISHED_RESOURCES_DIRECTORY, scope, identifier);

        await emptyDir(destDirectory);

        for (const srcFile of srcFiles) {
          const relativeFile = relative(srcDirectory, srcFile);
          if (relativeFile.startsWith('..')) {
            throw new Error(
              `Cannot publish a file (${formatPath(
                srcFile
              )}) located outside of the resource directory (${formatPath(srcDirectory)})`
            );
          }

          const destFile = join(destDirectory, relativeFile);

          await copy(srcFile, destFile);
        }

        if (hasPackageFile) {
          // TODO: this should not be done at publication time but
          // when the resource is installed
          await installPackage(destDirectory, {production: true});
        }
      },
      {
        intro: `Publishing ${formatString(name)} resource...`,
        outro: `Resource ${formatString(name)} published`
      }
    );
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

    this.$forEachChild(child => {
      const childDefinition = child.$serialize({omitName: true});
      if (childDefinition !== undefined) {
        const name = child.$name;
        definition[name] = childDefinition;
      }
    });

    const exportResource = this.$getExport();
    if (exportResource) {
      const exportDefinition = exportResource.$serialize();
      if (exportDefinition) {
        definition.$export = exportDefinition;
      }
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

Resource.prototype.$get = Resource.prototype.$getChild;
Resource.prototype.$set = Resource.prototype.$setChild;

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
