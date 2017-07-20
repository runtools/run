import {join, resolve, relative, basename, dirname, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {homedir} from 'os';
import {isPlainObject, entries, isEmpty, union} from 'lodash';
import isDirectory from 'is-directory';
import {copy, ensureDirSync, emptyDir, remove} from 'fs-extra';
import {
  addContextToErrors,
  getProperty,
  getPropertyKeyAndValue,
  loadFile,
  saveFile,
  task,
  formatString,
  formatPath,
  formatCode
} from 'run-common';
import {installPackage, PACKAGE_FILENAME} from '@resdir/package-manager';
import Version from '@resdir/version';

import {getPrimitiveResourceClass} from './primitives';
import Runtime from './runtime';

const RESOURCE_FILE_NAME = '@resource';
const RESOURCE_FILE_FORMATS = ['json', 'json5', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json';

const RUN_DIRECTORY = join(homedir(), '.run');
const PUBLISHED_RESOURCES_DIRECTORY = join(RUN_DIRECTORY, 'published-resources');
const INSTALLED_RESOURCES_DIRECTORY = join(RUN_DIRECTORY, 'installed-resources');

const BUILTIN_COMMANDS = [
  '@broadcastEvent',
  '@build',
  '@create',
  '@emitEvent',
  '@lint',
  '@install',
  '@publish',
  '@test'
];

export class Resource {
  async $construct(definition = {}, {bases = [], parent, name, directory, file} = {}) {
    await addContextToErrors(async () => {
      if (parent !== undefined) {
        this.$setParent(parent);
      }
      if (directory !== undefined) {
        this.$setCurrentDirectory(directory);
      }
      if (file !== undefined) {
        this.$setResourceFile(file);
      }
      if (name !== undefined) {
        this.$name = name;
      }

      const set = (target, source, aliases) => {
        const value = getProperty(definition, source, aliases);
        if (value !== undefined) {
          this[target] = value;
        }
      };

      set('$types', '@types', ['@type']);
      set('$location', '@location');
      set('$directory', '@directory');
      set('$name', '@name');
      set('$aliases', '@aliases', ['@alias']);
      set('$version', '@version');
      set('$description', '@description');
      set('$authors', '@authors', ['@author']);
      set('$repository', '@repository');
      set('$license', '@license');
      set('$runtime', '@runtime');
      set('$implementation', '@implementation');
      set('$files', '@files');
      set('$hidden', '@hidden');
      set('$autoBoxing', '@autoBoxing');
      set('$autoUnboxing', '@autoUnboxing');

      const optionsDefinition = getProperty(definition, '@options', ['@option']);
      if (optionsDefinition !== undefined) {
        await this.$setOptions(optionsDefinition);
      }

      for (const base of bases) {
        await this._inherit(base);
      }

      for (const name of Object.keys(definition)) {
        if (name.startsWith('@')) {
          continue;
        }
        await this.$setChild(name, definition[name], {ignoreAliases: true});
      }

      const exportDefinition = getProperty(definition, '@export', ['@exports']);
      if (exportDefinition !== undefined) {
        const resource = await this.constructor.$create(exportDefinition, {
          directory: this.$getCurrentDirectory({throwIfUndefined: false})
        });
        this.$setExport(resource);
      }
    }).call(this);
  }

  static async $create(
    definition = {},
    {base, parent, name, directory, file, importing, parse} = {}
  ) {
    let normalizedDefinition;
    if (isPlainObject(definition)) {
      normalizedDefinition = definition;
    } else {
      normalizedDefinition = {};
      if (definition !== undefined) {
        normalizedDefinition['@value'] = definition;
      }
    }

    let types = getProperty(normalizedDefinition, '@types', ['@type']);
    types = Resource.$normalizeTypes(types);

    const location = getProperty(normalizedDefinition, '@location');

    if (
      this === Resource &&
      types.length === 0 &&
      location === undefined &&
      base === undefined &&
      normalizedDefinition['@value'] !== undefined
    ) {
      types = [inferType(normalizedDefinition['@value'])];
    }

    if (file) {
      directory = dirname(file);
    }

    let NativeClass;
    const bases = [];

    if (base) {
      bases.push(base);
      NativeClass = base._getNativeClass();
    } else {
      NativeClass = this;
    }

    for (const type of types) {
      let Class;

      if (typeof type === 'string') {
        Class = getResourceClass(type);
      }

      if (!Class) {
        const base = await Resource.$import(type, {directory});
        bases.push(base);
        Class = base._getNativeClass();
      }

      NativeClass = findSubclass(NativeClass, Class);
    }

    if (location) {
      const base = await Resource.$load(location, {directory});
      bases.push(base);
      const Class = base._getNativeClass();
      NativeClass = findSubclass(NativeClass, Class);
    }

    let builders = [];
    for (const base of bases) {
      builders = union(builders, base._getClassBuilders());
    }

    const implementation = getProperty(normalizedDefinition, '@implementation');
    if (implementation) {
      if (location) {
        throw new Error(
          `Can't have both a ${formatCode('@location')} and an ${formatCode('@implementation')}`
        );
      }
      const builder = requireImplementation(implementation, {directory});
      if (builder && !builders.includes(builder)) {
        builders.push(builder);
      }
    }

    let ResourceClass = NativeClass;
    for (const builder of builders) {
      ResourceClass = builder(ResourceClass);
      ResourceClass._classBuilder = builder;
    }

    normalizedDefinition = ResourceClass.$normalize(definition, {parse});

    let resource = new ResourceClass();
    await resource.$construct(normalizedDefinition, {
      bases,
      parent,
      name,
      directory,
      file,
      parse
    });

    if (importing) {
      resource = resource.$getExport();
      if (!resource) {
        throw new Error('Can\'t import a resource without an @export property');
      }
    }

    return resource;
  }

  static async $load(
    specifier,
    {directory, importing, searchInParentDirectories, throwIfNotFound = true} = {}
  ) {
    let definition;
    let file;

    if (isPlainObject(specifier)) {
      definition = specifier;
    } else {
      if (specifier.startsWith('.')) {
        if (!directory) {
          throw new Error('\'directory\' argument is missing');
        }
        file = resolve(directory, specifier);
      } else if (isAbsolute(specifier)) {
        file = specifier;
      } else {
        file = await this.$fetch(specifier);
      }

      file = searchResourceFile(file, {searchInParentDirectories});
      if (!file) {
        if (throwIfNotFound) {
          throw new Error(`Resource not found: ${formatPath(specifier)}`);
        }
        return undefined;
      }

      definition = loadFile(file, {parse: true});
    }

    return await this.$create(definition, {file, directory, importing});
  }

  static async $import(specifier, {directory} = {}) {
    return await this.$load(specifier, {directory, importing: true});
  }

  static async $fetch(name) {
    // TODO: fetch resources from Resdir

    if (!this.$validateName(name)) {
      throw new Error(`Resource name ${formatString(name)} is invalid`);
    }

    const scope = this.$getScope(name);
    if (!scope) {
      throw new Error(`Can't fetch a resource with a unscoped name: ${formatString(name)}`);
    }

    const identifier = this.$getIdentifier(name);

    const resourcesDirectory = process.env.RUN_RESOURCES_DIRECTORY;
    if (resourcesDirectory) {
      // Development mode: resources are loaded directely from local source code
      const directory = join(resourcesDirectory, scope, identifier);
      return directory;
    }

    const directory = join(INSTALLED_RESOURCES_DIRECTORY, scope, identifier);
    if (existsSync(directory)) {
      return directory;
    }

    const publishedResourceDirectory = join(PUBLISHED_RESOURCES_DIRECTORY, scope, identifier);
    if (!existsSync(publishedResourceDirectory)) {
      throw new Error(`Can't find resource ${formatString(name)} at Resdir`);
    }

    await task(
      async () => {
        await copy(publishedResourceDirectory, directory);

        if (existsSync(join(directory, PACKAGE_FILENAME))) {
          // Only useful for js/dependencies
          await installPackage(directory, {production: true});
        }

        const resource = await this.$load(directory);
        await resource['@install']();
      },
      {
        intro: `Installing ${formatString(name)} from Resdir...`,
        outro: `${formatString(name)} installed from Resdir`
      }
    );

    return directory;
  }

  async $extend(definition, options) {
    return await this.constructor.$create(definition, {...options, base: this});
  }

  $hasBase(resource) {
    return Boolean(this.$findBase(base => base === resource));
  }

  async $save({directory, ensureDirectory} = {}) {
    await this.$emitEvent('before:@save');

    if (!this.$isRoot()) {
      throw new Error('Can\'t save a child resource');
    }

    let file = this.$getResourceFile();

    if (!file) {
      if (!directory) {
        directory = this.$getCurrentDirectory({throwIfUndefined: false});
      }
      if (!directory) {
        throw new Error('Can\'t determine the path of the resource file');
      }
      file = join(directory, RESOURCE_FILE_NAME + '.' + DEFAULT_RESOURCE_FILE_FORMAT);
      this.$setResourceFile(file);
    }

    let definition = this.$serialize();
    if (definition === undefined) {
      definition = {};
    }

    if (ensureDirectory) {
      ensureDirSync(dirname(file));
    }

    saveFile(file, definition, {stringify: true});

    await this.$emitEvent('after:@save');
  }

  _bases = [];

  async _inherit(base) {
    this._bases.push(base);
    await base.$forEachChild(async child => {
      await this.$setChild(child.$name, undefined, {ignoreAliases: true});
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

  _getInheritedValue(name) {
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

  $getResourceFile() {
    return this._resourceFile;
  }

  $setResourceFile(file) {
    this._resourceFile = file;
  }

  $getCurrentDirectory({throwIfUndefined = true} = {}) {
    let currentDirectory = this._currentDirectory;

    if (!currentDirectory) {
      const resourceFile = this.$getResourceFile();
      if (resourceFile) {
        currentDirectory = dirname(resourceFile);
      }
    }

    const directory = this.$directory;

    if (directory) {
      if (isAbsolute(directory)) {
        currentDirectory = directory;
      }
    }

    if (!currentDirectory) {
      if (throwIfUndefined) {
        throw new Error('Can\'t determine the current directory');
      }
      return undefined;
    }

    if (directory) {
      currentDirectory = resolve(currentDirectory, directory);
    }

    return currentDirectory;
  }

  $setCurrentDirectory(directory) {
    this._currentDirectory = directory;
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
      throw new Error(`Invalid ${formatCode('@type')} value`);
    }
    return types;
  }

  get $location() {
    return this._location;
  }

  set $location(location) {
    if (!(typeof location === 'string' || isPlainObject(location))) {
      throw new Error(`Invalid ${formatCode('@location')} value`);
    }
    this._location = location;
  }

  get $directory() {
    return this._directory;
  }

  set $directory(directory) {
    this._directory = directory;
  }

  get $name() {
    return this._getInheritedValue('_name');
  }

  set $name(name) {
    if (name !== undefined) {
      if (!this.constructor.$validateName(name)) {
        throw new Error(`Resource name ${formatString(name)} is invalid`);
      }
    }
    this._name = name;
  }

  static $getScope(name) {
    if (!name) {
      return undefined;
    }
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return undefined;
    }
    return scope;
  }

  $getScope() {
    return this.constructor.$getScope(this.$name);
  }

  static $getIdentifier(name) {
    if (!name) {
      return undefined;
    }
    const [scope, identifier] = name.split('/');
    if (!identifier) {
      return scope;
    }
    return identifier;
  }

  $getIdentifier() {
    return this.constructor.$getIdentifier(this.$name);
  }

  static $validateName(name) {
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

  static $validateNamePart(part) {
    if (!part) {
      return false;
    }

    if (/[^a-z0-9._-]/i.test(part)) {
      return false;
    }

    if (/[^a-z0-9_]/i.test(part[0])) {
      return false;
    }

    if (/[^a-z0-9]/i.test(part[part.length - 1])) {
      return false;
    }

    return true;
  }

  get $aliases() {
    return this._getInheritedValue('_aliases');
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
    return this._getInheritedValue('_version');
  }

  set $version(version) {
    if (typeof version === 'string') {
      version = new Version(version);
    }
    this._version = version;
  }

  get $description() {
    return this._getInheritedValue('_description');
  }

  set $description(description) {
    this._description = description;
  }

  get $authors() {
    return this._getInheritedValue('_authors');
  }

  set $authors(authors) {
    if (typeof authors === 'string') {
      authors = [authors];
    }
    this._authors = authors;
  }

  get $repository() {
    return this._getInheritedValue('_repository');
  }

  set $repository(repository) {
    this._repository = repository;
  }

  get $license() {
    return this._getInheritedValue('_license');
  }

  set $license(license) {
    this._license = license;
  }

  get $runtime() {
    return this._getInheritedValue('_runtime');
  }

  set $runtime(runtime) {
    if (typeof runtime === 'string') {
      runtime = new Runtime(runtime);
    }
    this._runtime = runtime;
  }

  get $implementation() {
    return this._implementation;
  }

  set $implementation(implementation) {
    this._implementation = implementation;
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

  get $hidden() {
    return this._getInheritedValue('_hidden');
  }

  set $hidden(hidden) {
    this._hidden = hidden;
  }

  $defaultAutoBoxing = false;

  get $autoBoxing() {
    let autoBoxing = this._getInheritedValue('_autoBoxing');
    if (autoBoxing === undefined) {
      autoBoxing = this.$defaultAutoBoxing;
    }
    return autoBoxing;
  }

  set $autoBoxing(autoBoxing) {
    this._autoBoxing = autoBoxing;
  }

  $defaultAutoUnboxing = false;

  get $autoUnboxing() {
    let autoUnboxing = this._getInheritedValue('_autoUnboxing');
    if (autoUnboxing === undefined) {
      autoUnboxing = this.$defaultAutoUnboxing;
    }
    return autoUnboxing;
  }

  set $autoUnboxing(autoUnboxing) {
    this._autoUnboxing = autoUnboxing;
  }

  $getOptions() {
    return this._getInheritedValue('_options');
  }

  async $setOptions(options) {
    this._options = undefined;
    if (options === undefined) {
      return;
    }
    for (let [name, option] of entries(options)) {
      option = await Resource.$create(option, {
        name,
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      if (this._options === undefined) {
        this._options = [];
      }
      this._options.push(option);
    }
  }

  $getExport() {
    return this._export;
  }

  $setExport(resource) {
    this._export = resource;
  }

  _children = [];

  $forEachChild(fn) {
    const promises = [];
    for (let i = 0; i < this._children.length; i++) {
      const child = this._children[i];
      const result = fn(child, i);
      if (result === false) {
        break;
      }
      if (result && typeof result.then === 'function') {
        promises.push(result);
      }
    }
    if (promises.length) {
      return Promise.all(promises);
    }
  }

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

  async $setChild(name, definition, {ignoreAliases} = {}) {
    const removedChildIndex = this.$removeChild(name, {ignoreAliases});

    const base = this.$getChildFromBases(name, {ignoreAliases});
    const child = await Resource.$create(definition, {
      base,
      name,
      directory: this.$getCurrentDirectory({throwIfUndefined: false}),
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
        return child.$autoUnbox();
      },
      set(value) {
        const promise = child.$autoBox(value);
        if (promise) {
          throw new Error(
            `Can't change ${formatCode(
              name
            )} synchronously with a property setter. Please use the $setChild() asynchronous method.`
          );
        }
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

  $autoBox(value) {
    if (this.$autoBoxing) {
      const boxer = this.$box;
      if (!boxer) {
        throw new Error(`${formatCode('$boxer')} is not implemented`);
      }
      boxer.call(this, value);
      return;
    }

    const parent = this.$getParent();
    if (!parent) {
      throw new Error('Can\'t set a child without a parent');
    }

    const name = this.$name;
    if (!name) {
      throw new Error('Can\'t set a child without a \'@name\'');
    }

    return parent.$setChild(name, value, {ignoreAliases: true});
  }

  $autoUnbox() {
    if (this.$autoUnboxing) {
      const unboxer = this.$unbox;
      if (!unboxer) {
        throw new Error(`${formatCode('$unboxer')} is not implemented`);
      }
      return unboxer.call(this);
    }

    return this;
  }

  async $invoke(expression = {arguments: [], options: {}}, {_parent} = {}) {
    expression = {...expression, arguments: [...expression.arguments]};
    const name = expression.arguments.shift();
    if (!name) {
      return this;
    }

    if (BUILTIN_COMMANDS.includes(name)) {
      return await this[name](...expression.arguments);
    }

    const child = this.$getChild(name);
    if (!child) {
      throw new Error(`Child not found: ${formatCode(name)}`);
    }

    return await child.$invoke(expression, {parent: this});
  }

  $listenEvent(event, method) {
    if (!this._listeners) {
      this._listeners = {};
    }
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(method);
  }

  async $emitEvent(event, ...args) {
    const methods = [];
    this.$forSelfAndEachBase(
      resource => {
        if (resource._listeners && resource._listeners[event]) {
          methods.unshift(...resource._listeners[event]);
        }
      },
      {deepSearch: true}
    );
    for (const method of methods) {
      const fn = method.$getFunction();
      await fn.apply(this, args);
    }
  }

  async $broadcastEvent(event, ...args) {
    await this.$emitEvent(event, ...args);
    await this.$forEachChild(async child => {
      await child.$broadcastEvent(event, ...args);
    });
  }

  async '@create'(name) {
    if (!name) {
      throw new Error(`${formatCode('name')} argument is missing`);
    }

    const resource = await task(
      async () => {
        const resource = await Resource.$create({
          '@type': this.$name,
          '@name': name,
          '@version': '0.1.0'
        });

        await resource.$broadcastEvent('before:@create');

        const directory = join(process.cwd(), resource.$getIdentifier());

        const existingResource = await this.constructor.$load(directory, {throwIfNotFound: false});
        if (existingResource) {
          throw new Error(`A resource already exists in ${formatPath(directory)}`);
        }

        await resource.$save({directory, ensureDirectory: true});

        await resource.$broadcastEvent('after:@create');

        return resource;
      },
      {
        intro: `Creating ${formatString(name)} resource...`,
        outro: `Resource ${formatString(name)} created`
      }
    );

    return resource;
  }

  async '@install'() {
    await this.$broadcastEvent('before:@install');
    // NOOP
    await this.$broadcastEvent('after:@install');
  }

  async '@build'() {
    await this.$broadcastEvent('before:@build');
    // NOOP
    await this.$broadcastEvent('after:@build');
  }

  async '@lint'() {
    await this.$broadcastEvent('before:@lint');
    // NOOP
    await this.$broadcastEvent('after:@lint');
  }

  async '@test'() {
    await this.$broadcastEvent('before:@test');
    // NOOP
    await this.$broadcastEvent('after:@test');
  }

  async '@publish'() {
    await this.$emitEvent('before:@publish'); // TODO: should use $broadcastEvent?

    const name = this.$name;
    if (!name) {
      throw new Error(`Can't publish a resource without a ${formatCode('@name')} property`);
    }

    await task(
      async () => {
        const scope = this.$getScope();
        if (!scope) {
          throw new Error(`Can't publish a resource with a unscoped ${formatCode('@name')}`);
        }

        const identifier = this.$getIdentifier();

        if (!this.$version) {
          throw new Error(`Can't publish a resource without a ${formatCode('@version')} property`);
        }

        const resourceFile = this.$getResourceFile();
        if (!resourceFile) {
          throw new Error(`Can't publish a resource without a ${formatPath('@resource')} file`);
        }

        const srcDirectory = this.$getCurrentDirectory();

        const srcFiles = [resourceFile];
        if (this.$files) {
          for (const file of this.$files) {
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

          const installedResourceDirectory = join(INSTALLED_RESOURCES_DIRECTORY, scope, identifier);
          await remove(installedResourceDirectory);
        }
      },
      {
        intro: `Publishing ${formatString(name)} resource...`,
        outro: `Resource ${formatString(name)} published`
      }
    );

    await this.$emitEvent('after:@publish'); // TODO: should use $broadcastEvent?
  }

  async '@emitEvent'(event, ...args) {
    return await this.$emitEvent(event, ...args);
  }

  async '@broadcastEvent'(event, ...args) {
    return await this.$broadcastEvent(event, ...args);
  }

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw new Error('Invalid resource definition');
    }
    return definition;
  }

  $serialize({omitName} = {}) {
    let definition = {};

    this._serializeTypes(definition);

    if (this._location !== undefined) {
      definition['@location'] = this._location;
    }

    if (this._directory !== undefined) {
      definition['@directory'] = this._directory;
    }

    if (!omitName && this._name !== undefined) {
      definition['@name'] = this._name;
    }

    this._serializeAliases(definition);

    if (this._version !== undefined) {
      definition['@version'] = this._version.toJSON();
    }

    if (this._description !== undefined) {
      definition['@description'] = this._description;
    }

    this._serializeAuthors(definition);

    if (this._repository !== undefined) {
      definition['@repository'] = this._repository;
    }

    if (this._license !== undefined) {
      definition['@license'] = this._license;
    }

    if (this._runtime !== undefined) {
      definition['@runtime'] = this._runtime.toJSON();
    }

    if (this._implementation !== undefined) {
      definition['@implementation'] = this._implementation;
    }

    if (this._files !== undefined) {
      definition['@files'] = this._files;
    }

    if (this._hidden !== undefined) {
      definition['@hidden'] = this._hidden;
    }

    if (this._autoBoxing !== undefined) {
      definition['@autoBoxing'] = this._autoBoxing;
    }

    if (this._autoUnboxing !== undefined) {
      definition['@autoUnboxing'] = this._autoUnboxing;
    }

    this._serializeOptions(definition);

    this._serializeChildren(definition);

    this._serializeExport(definition);

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }

  _serializeTypes(definition) {
    const types = this._types;
    if (types !== undefined) {
      if (types.length === 1) {
        definition['@type'] = types[0];
      } else if (types.length > 1) {
        definition['@types'] = types;
      }
    }
  }

  _serializeAliases(definition) {
    let aliases = this._aliases;
    if (aliases !== undefined) {
      aliases = Array.from(aliases);
      if (aliases.length === 1) {
        definition['@alias'] = aliases[0];
      } else if (aliases.length > 1) {
        definition['@aliases'] = aliases;
      }
    }
  }

  _serializeAuthors(definition) {
    const authors = this._authors;
    if (authors !== undefined) {
      if (authors.length === 1) {
        definition['@author'] = authors[0];
      } else if (authors.length > 1) {
        definition['@authors'] = authors;
      }
    }
  }

  _serializeOptions(definition) {
    const options = this._options;
    if (options) {
      const serializedOptions = {};
      let count = 0;
      for (const option of options) {
        const serializedOption = option.$serialize({omitName: true});
        if (serializedOption !== undefined) {
          serializedOptions[option.$name] = serializedOption;
          count++;
        }
      }
      if (count === 1) {
        definition['@option'] = serializedOptions;
      } else if (count > 1) {
        definition['@options'] = serializedOptions;
      }
    }
  }

  _serializeChildren(definition) {
    this.$forEachChild(child => {
      const childDefinition = child.$serialize({omitName: true});
      if (childDefinition !== undefined) {
        const name = child.$name;
        definition[name] = childDefinition;
      }
    });
  }

  _serializeExport(definition) {
    const exportResource = this.$getExport();
    if (exportResource) {
      const exportDefinition = exportResource.$serialize();
      if (exportDefinition) {
        definition['@export'] = exportDefinition;
      }
    }
  }

  _getNativeClass() {
    let Class = this.constructor;
    while (Class._classBuilder) {
      Class = Object.getPrototypeOf(Class);
    }
    return Class;
  }

  _getClassBuilders() {
    const builders = [];
    let Class = this.constructor;
    while (Class._classBuilder) {
      builders.unshift(Class._classBuilder);
      Class = Object.getPrototypeOf(Class);
    }
    return builders;
  }
}

function findSubclass(A, B) {
  if (A === B || Object.prototype.isPrototypeOf.call(B, A)) {
    return A;
  } else if (Object.prototype.isPrototypeOf.call(A, B)) {
    return B;
  }
  throw new Error(`Can't mix a ${A.name} with a ${B.name}`);
}

function getResourceClass(type) {
  if (type === 'resource') {
    return Resource;
  }
  return getPrimitiveResourceClass(type);
}

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
  throw new Error('Cannot infer the type from @value');
}

function requireImplementation(implementationFile, {directory} = {}) {
  let file = implementationFile;
  if (!isAbsolute(file) && directory) {
    file = resolve(directory, file);
  }
  file = searchImplementationFile(file);
  if (!file) {
    console.warn(`Implementation file not found: ${formatPath(implementationFile)}`);
  }
  try {
    const result = require(file);
    return result.default || result;
  } catch (err) {
    // console.warn(
    //   `An error occured while loading implementation (file: ${formatPath(file)}): ${err.message}`
    // );
  }
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
