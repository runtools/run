import {join, resolve, basename, dirname, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {homedir} from 'os';
import {isPlainObject, isEmpty, union, entries} from 'lodash';
import isDirectory from 'is-directory';
import {ensureDirSync, ensureFileSync} from 'fs-extra';
import {getProperty} from '@resdir/util';
import {catchContext, task, formatString, formatPath, formatCode} from '@resdir/console';
import {load, save} from '@resdir/file-manager';
import {
  getResourceNamespace,
  getResourceIdentifier,
  validateResourceName,
  parseResourceName
} from '@resdir/resource-name';
import {parseResourceSpecifier, formatResourceSpecifier} from '@resdir/resource-specifier';
import Version from '@resdir/version';
import RegistryClient from '@resdir/registry-client';
import RegistryCache from '@resdir/registry-cache';

import {getPrimitiveResourceClass} from './primitives';
import {shiftArguments, findPositionalArguments} from './arguments';
import Runtime from './runtime';

const RUN_DIRECTORY = join(homedir(), '.run');
const CLIENT_ID = 'RUN_CLI';

// TODO: Change this AWS config when production is deployed
const RESDIR_REGISTRY_URL = 'http://registry.dev.resdir.com';
const RESDIR_REGISTRY_AWS_REGION = 'ap-northeast-1';
const RESDIR_REGISTRY_AWS_S3_BUCKET_NAME = 'resdir-registry-dev-v1';
const RESDIR_REGISTRY_AWS_S3_RESOURCE_UPLOADS_PREFIX = 'resources/uploads/';

const RESOURCE_FILE_NAME = '@resource';
const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json5';

const BUILTIN_COMMANDS = [
  '@broadcastEvent',
  '@build',
  '@create',
  '@emitEvent',
  '@lint',
  '@install',
  '@publish',
  '@signUp',
  '@signIn',
  '@signOut',
  '@user',
  '@organization',
  '@test'
];

export class Resource {
  async $construct(definition = {}, {bases = [], parent, key, directory, file} = {}) {
    await catchContext(this, async () => {
      if (parent !== undefined) {
        this.$setParent(parent);
      }

      if (key !== undefined) {
        this.$setKey(key);
      }

      if (directory !== undefined) {
        this.$setCurrentDirectory(directory);
      }

      if (file !== undefined) {
        this.$setResourceFile(file);
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
      set('$position', '@position');
      set('$version', '@version');
      set('$description', '@description');
      set('$authors', '@authors', ['@author']);
      set('$repository', '@repository');
      set('$license', '@license');
      set('$runtime', '@runtime');
      set('$implementation', '@code');
      set('$files', '@files');
      set('$hidden', '@hidden');
      set('$publishable', '@publishable');
      set('$autoBoxing', '@autoBoxing');
      set('$autoUnboxing', '@autoUnboxing');

      const parameters = getProperty(definition, '@parameters');
      if (parameters !== undefined) {
        await this.$setParameters(parameters);
      }

      for (const base of bases) {
        await this._inherit(base);
      }

      for (const key of Object.keys(definition)) {
        if (key.startsWith('@')) {
          continue;
        }
        await this.$setChild(key, definition[key]);
      }

      const exportDefinition = getProperty(definition, '@export', ['@exports']);
      if (exportDefinition !== undefined) {
        const resource = await this.constructor.$create(exportDefinition, {
          directory: this.$getCurrentDirectory({throwIfUndefined: false})
        });
        this.$setExport(resource);
      }
    });
  }

  static async $create(definition, {base, parent, key, directory, file, importing, parse} = {}) {
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

    const implementation = getProperty(normalizedDefinition, '@code');
    if (implementation) {
      if (location) {
        throw new Error(
          `Can't have both a ${formatCode('@location')} and an ${formatCode('@code')}`
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
      key,
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

  static $getRegistry() {
    if (!this._registry) {
      const registryURL = process.env.RESDIR_REGISTRY_URL || RESDIR_REGISTRY_URL;
      const runDirectory = process.env.RUN_DIRECTORY || RUN_DIRECTORY;
      const clientId = CLIENT_ID;
      const awsRegion = process.env.RESDIR_REGISTRY_AWS_REGION || RESDIR_REGISTRY_AWS_REGION;
      const awsS3BucketName =
        process.env.RESDIR_REGISTRY_AWS_S3_BUCKET_NAME || RESDIR_REGISTRY_AWS_S3_BUCKET_NAME;
      const awsS3ResourceUploadsPrefix =
        process.env.RESDIR_REGISTRY_AWS_S3_RESOURCE_UPLOADS_PREFIX ||
        RESDIR_REGISTRY_AWS_S3_RESOURCE_UPLOADS_PREFIX;
      const client = new RegistryClient({
        registryURL,
        runDirectory,
        clientId,
        awsRegion,
        awsS3BucketName,
        awsS3ResourceUploadsPrefix
      });
      const cache = new RegistryCache({client, runDirectory});
      this._registry = cache;
    }
    return this._registry;
  }

  static async $load(
    specifier,
    {directory, importing, searchInParentDirectories, throwIfNotFound = true} = {}
  ) {
    let result;

    if (isPlainObject(specifier)) {
      result = {definition: specifier};
    } else {
      const {location} = parseResourceSpecifier(specifier);
      if (location) {
        result = await this._fetchFromLocation(location, {directory, searchInParentDirectories});
      } else {
        result = await this._fetchFromLocalResources(specifier);
        if (!result) {
          result = await this._fetchFromRegistry(specifier);
        }
      }
    }

    if (!result) {
      if (throwIfNotFound) {
        throw new Error(`Resource not found: ${formatString(specifier)}`);
      }
      return undefined;
    }

    const {definition, file} = result;
    directory = result.directory;
    const resource = await this.$create(definition, {file, directory, importing});

    return resource;
  }

  static async _fetchFromLocation(location, {directory, searchInParentDirectories} = {}) {
    let file = location;
    if (file.startsWith('.')) {
      if (!directory) {
        throw new Error('\'directory\' argument is missing');
      }
      file = resolve(directory, file);
    }
    file = searchResourceFile(file, {searchInParentDirectories});
    if (!file) {
      return undefined;
    }
    const definition = load(file);
    return {definition, file};
  }

  static async _fetchFromLocalResources(specifier) {
    // Useful for development: resources are loaded directly from local source code

    const {name, versionRange} = parseResourceSpecifier(specifier);
    const {namespace, identifier} = parseResourceName(name);

    const resourcesDirectory = process.env.RUN_LOCAL_RESOURCES;
    if (!resourcesDirectory || resourcesDirectory === '0') {
      return undefined;
    }

    const directory = join(resourcesDirectory, namespace, identifier);
    if (!existsSync(directory)) {
      return undefined;
    }

    const {definition, file} = await this._fetchFromLocation(directory);

    const version = definition['@version'];
    if (!versionRange.includes(version)) {
      return undefined;
    }

    return {definition, file};
  }

  static async _fetchFromRegistry(specifier) {
    const registry = this.$getRegistry();
    const result = await registry.fetchResource(specifier);
    if (!result) {
      return undefined;
    }

    const {definition, directory} = result;

    const installedFlagFile = join(directory, '.installed');
    if (!existsSync(installedFlagFile)) {
      const nameAndVersion = formatResourceSpecifier({
        name: definition['@name'],
        versionRange: definition['@version']
      });
      await task(
        async () => {
          const resource = await this.$create(definition, {directory});
          await resource['@install']();
          ensureFileSync(installedFlagFile);
        },
        {
          intro: `Installing ${formatString(nameAndVersion)}...`,
          outro: `${formatString(nameAndVersion)} installed`
        }
      );
    }

    return {definition, directory};
  }

  static async $import(specifier, {directory} = {}) {
    return await this.$load(specifier, {directory, importing: true});
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

    save(file, definition);

    await this.$emitEvent('after:@save');
  }

  _bases = [];

  async _inherit(base) {
    this._bases.push(base);
    await base.$forEachChildAsync(async child => {
      await this.$setChild(child.$getKey(), undefined);
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

  _getInheritedValue(key) {
    let result;
    this.$forSelfAndEachBase(
      resource => {
        if (key in resource) {
          result = resource[key];
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

  $getKey() {
    return this._key;
  }

  $setKey(key) {
    this._key = key;
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
      validateResourceName(name);
    }
    this._name = name;
  }

  $getNamespace() {
    return getResourceNamespace(this.$name);
  }

  $getIdentifier() {
    return getResourceIdentifier(this.$name);
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

  get $position() {
    return this._getInheritedValue('_position');
  }

  set $position(position) {
    if (position !== undefined && typeof position !== 'number') {
      throw new TypeError(`Property ${formatCode('@position')} must be a number`);
    }
    this._position = position;
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

  $getParameters() {
    return this._getInheritedValue('_parameters');
  }

  async $setParameters(parameters) {
    this._parameters = undefined;
    if (parameters === undefined) {
      return;
    }
    if (!isPlainObject(parameters)) {
      throw new Error(`${formatCode('parameters')} property must be an object`);
    }
    for (const [key, definition] of entries(parameters)) {
      const parameter = await Resource.$create(definition, {
        key,
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      if (this._parameters === undefined) {
        this._parameters = [];
      }
      this._parameters.push(parameter);
    }
  }

  $getAllParameters() {
    const allParameters = [];
    let resource = this;
    while (resource) {
      const parameters = resource.$getParameters && resource.$getParameters();
      if (parameters) {
        for (const parameter of parameters) {
          if (!allParameters.find(param => param.$getKey() === parameter.$getKey())) {
            allParameters.push(parameter);
          }
        }
      }
      resource = resource.$getParent();
    }
    return allParameters;
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

  get $publishable() {
    let publishable = this._getInheritedValue('_publishable');
    if (publishable === undefined) {
      publishable = true;
    }
    return publishable;
  }

  set $publishable(publishable) {
    this._publishable = publishable;
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

  async $forEachChildAsync(fn) {
    const childs = [];
    this.$forEachChild(child => childs.push(child));
    for (const child of childs) {
      const result = await fn(child);
      if (result === false) {
        break;
      }
    }
  }

  $getChild(key) {
    let result;
    this.$forEachChild(child => {
      if (child.$getKey() === key) {
        result = child;
        return false;
      }
    });
    return result;
  }

  $findChild(key) {
    let result;
    this.$forEachChild(child => {
      if (child.$getKey() === key || child.$hasAlias(key)) {
        result = child;
        return false;
      }
    });
    return result;
  }

  $getChildFromBases(key) {
    let result;
    this.$forEachBase(base => {
      result = base.$getChild(key);
      if (result) {
        return false;
      }
    });
    return result;
  }

  async $setChild(key, definition) {
    const removedChildIndex = this.$removeChild(key);

    const base = this.$getChildFromBases(key);
    const child = await Resource.$create(definition, {
      base,
      key,
      directory: this.$getCurrentDirectory({throwIfUndefined: false}),
      parent: this
    });

    if (removedChildIndex !== undefined) {
      // Try to not change the order of children
      this._children.splice(removedChildIndex, 0, child);
    } else {
      this._children.push(child);
    }

    Object.defineProperty(this, key, {
      get() {
        return child.$autoUnbox();
      },
      set(value) {
        const promise = child.$autoBox(value);
        if (promise) {
          throw new Error(
            `Can't change ${formatCode(
              key
            )} synchronously with a property setter. Please use the $setChild() asynchronous method.`
          );
        }
      },
      configurable: true
    });
  }

  $removeChild(key) {
    let result;
    this.$forEachChild((child, index) => {
      if (child.$getKey() === key) {
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

    const key = this.$getKey();
    if (!key) {
      throw new Error('Can\'t set a child without a key');
    }

    return parent.$setChild(key, value);
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

  async $invoke(args, {_parent} = {}) {
    return await catchContext(this, async () => {
      args = {...args};
      const key = shiftArguments(args);
      if (key === undefined) {
        return this;
      }

      if (BUILTIN_COMMANDS.includes(key)) {
        return await this[key](args);
      }

      const child = this.$findChild(key);
      if (!child) {
        throw new Error(`No property or method found with this key: ${formatCode(key)}`);
      }

      return await child.$invoke(args, {parent: this});
    });
  }

  $listenEvent(event, method) {
    if (typeof event !== 'string') {
      throw new TypeError('\'event\' argument must be a string');
    }

    if (!this._listeners) {
      this._listeners = {};
    }
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(method);
  }

  async $emitEvent(event, args = {}, {parseArguments} = {}) {
    if (typeof event !== 'string') {
      throw new TypeError('\'event\' argument must be a string');
    }

    if (!isPlainObject(args)) {
      throw new TypeError('\'args\' argument must be a plain object');
    }

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
      const fn = method.$getFunction({parseArguments});
      await fn.call(this, args);
    }
  }

  async $broadcastEvent(event, args, {parseArguments} = {}) {
    await this.$emitEvent(event, args, {parseArguments});
    await this.$forEachChildAsync(async child => {
      await child.$broadcastEvent(event, args, {parseArguments});
    });
  }

  async '@create'({type, name}) {
    if (!type || typeof type !== 'string') {
      throw new Error(`${formatCode('type')} argument is missing`);
    }

    if (!name || typeof name !== 'string') {
      throw new Error(`${formatCode('name')} argument is missing`);
    }

    const resource = await task(
      async () => {
        const definition = {'@type': type};
        if (!name.startsWith('@')) {
          // Don't set @name if it looks like a npm package scoped name
          definition['@name'] = name;
        }
        definition['@version'] = '0.1.0';

        const resource = await Resource.$create(definition);

        await resource.$broadcastEvent('before:@create', {name}, {parseArguments: true});

        const directory = join(process.cwd(), getResourceIdentifier(name));

        const existingResource = await this.constructor.$load(directory, {throwIfNotFound: false});
        if (existingResource) {
          throw new Error(`A resource already exists in ${formatPath(directory)}`);
        }

        await resource.$save({directory, ensureDirectory: true});

        await resource.$broadcastEvent('after:@create', {name}, {parseArguments: true});

        return resource;
      },
      {
        intro: `Creating ${formatString(name)} resource...`,
        outro: `Resource ${formatString(name)} created`
      }
    );

    return resource;
  }

  async '@install'(args) {
    await this.$broadcastEvent('before:@install', args, {parseArguments: true});
    await this.$broadcastEvent('after:@install', args, {parseArguments: true});
  }

  async '@build'(args) {
    await this.$broadcastEvent('before:@build', args, {parseArguments: true});
    await this.$broadcastEvent('after:@build', args, {parseArguments: true});
  }

  async '@lint'(args) {
    await this.$broadcastEvent('before:@lint', args, {parseArguments: true});
    await this.$broadcastEvent('after:@lint', args, {parseArguments: true});
  }

  async '@test'(args) {
    await this.$broadcastEvent('before:@test', args, {parseArguments: true});
    await this.$broadcastEvent('after:@test', args, {parseArguments: true});
  }

  async '@signUp'({email}) {
    const registry = this.constructor.$getRegistry();
    await registry.signUp(email);
  }

  async '@signIn'({email}) {
    const registry = this.constructor.$getRegistry();
    await registry.signIn(email);
  }

  async '@signOut'() {
    const registry = this.constructor.$getRegistry();
    await registry.signOut();
  }

  async '@user'(args) {
    args = findPositionalArguments(args);

    const registry = this.constructor.$getRegistry();

    let key;
    key = args.shift();
    if (key === 'show') {
      await registry.showUser();
    } else if (key === 'delete') {
      await registry.deleteUser();
    } else if (key === 'organizations') {
      key = args.shift();
      if (key === 'list') {
        await registry.listUserOrganizations();
      } else {
        throw new Error('UNIMPLEMENTED');
      }
    } else if (key === 'namespace') {
      key = args.shift();
      if (key === 'create') {
        const namespace = args.shift();
        await registry.createUserNamespace(namespace);
      } else if (key === 'remove') {
        await registry.removeUserNamespace();
      } else {
        throw new Error('UNIMPLEMENTED');
      }
    } else if (key === 'github') {
      key = args.shift();
      if (key === 'connect') {
        await registry.connectGitHubAccount();
      } else if (key === 'disconnect') {
        await registry.disconnectGitHubAccount();
      } else {
        throw new Error('UNIMPLEMENTED');
      }
    } else {
      throw new Error('UNIMPLEMENTED');
    }
  }

  async '@organization'(args) {
    args = findPositionalArguments(args);

    const registry = this.constructor.$getRegistry();

    const key = args.shift();
    if (key === 'create') {
      const namespace = args.shift();
      await registry.createOrganization(namespace);
    } else if (key === 'delete') {
      const namespace = args.shift();
      await registry.deleteOrganization(namespace);
    } else if (key === 'addMember') {
      const organizationNamespace = args.shift();
      const userNamespace = args.shift();
      await registry.addOrganizationMember(organizationNamespace, userNamespace);
    } else if (key === 'removeMember') {
      const organizationNamespace = args.shift();
      const userNamespace = args.shift();
      await registry.removeOrganizationMember(organizationNamespace, userNamespace);
    } else {
      throw new Error('UNIMPLEMENTED');
    }
  }

  async '@publish'(args) {
    await this.$emitEvent('before:@publish', args, {parseArguments: true});

    const name = this.$name;
    if (!name) {
      throw new Error(`Can't publish a resource without a ${formatCode('@name')} property`);
    }

    await task(
      async () => {
        const definition = this.$serialize({publishing: true});
        const directory = this.$getCurrentDirectory();
        const registry = this.constructor.$getRegistry();
        await registry.publishResource(definition, directory);
      },
      {
        intro: `Publishing ${formatString(name)} resource...`,
        outro: `Resource ${formatString(name)} published`
      }
    );

    await this.$emitEvent('after:@publish', args, {parseArguments: true});
  }

  async '@emitEvent'({event, args}) {
    args = JSON.parse(args); // TODO: remove this stupid parsing
    return await this.$emitEvent(event, args, {parseArguments: true});
  }

  async '@broadcastEvent'({event, args}) {
    args = JSON.parse(args); // TODO: remove this stupid parsing
    return await this.$broadcastEvent(event, args, {parseArguments: true});
  }

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw new Error('Invalid resource definition');
    }
    return definition;
  }

  $serialize(options) {
    let definition = {};

    this._serializeTypes(definition, options);

    if (this._location !== undefined) {
      definition['@location'] = this._location;
    }

    if (this._directory !== undefined) {
      definition['@directory'] = this._directory;
    }

    if (this._name !== undefined) {
      definition['@name'] = this._name;
    }

    this._serializeAliases(definition, options);

    this._serializeParameters(definition, options);

    if (this._position !== undefined) {
      definition['@position'] = this._position;
    }

    if (this._version !== undefined) {
      definition['@version'] = this._version.toJSON();
    }

    if (this._description !== undefined) {
      definition['@description'] = this._description;
    }

    this._serializeAuthors(definition, options);

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
      definition['@code'] = this._implementation;
    }

    if (this._files !== undefined) {
      definition['@files'] = this._files;
    }

    if (this._hidden !== undefined) {
      definition['@hidden'] = this._hidden;
    }

    if (this._publishable !== undefined) {
      definition['@publishable'] = this._publishable;
    }

    if (this._autoBoxing !== undefined) {
      definition['@autoBoxing'] = this._autoBoxing;
    }

    if (this._autoUnboxing !== undefined) {
      definition['@autoUnboxing'] = this._autoUnboxing;
    }

    this._serializeChildren(definition, options);

    this._serializeExport(definition, options);

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }

  _serializeTypes(definition, _options) {
    const types = this._types;
    if (types !== undefined) {
      if (types.length === 1) {
        definition['@type'] = types[0];
      } else if (types.length > 1) {
        definition['@types'] = types;
      }
    }
  }

  _serializeAliases(definition, _options) {
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

  _serializeParameters(definition, _options) {
    const parameters = this._parameters;
    if (parameters) {
      const serializedParameters = {};
      let count = 0;
      for (const parameter of parameters) {
        const parameterDefinition = parameter.$serialize();
        if (parameterDefinition !== undefined) {
          serializedParameters[parameter.$getKey()] = parameterDefinition;
          count++;
        }
      }
      if (count > 0) {
        definition['@parameters'] = serializedParameters;
      }
    }
  }

  _serializeAuthors(definition, _options) {
    const authors = this._authors;
    if (authors !== undefined) {
      if (authors.length === 1) {
        definition['@author'] = authors[0];
      } else if (authors.length > 1) {
        definition['@authors'] = authors;
      }
    }
  }

  _serializeChildren(definition, options) {
    this.$forEachChild(child => {
      const publishing = options && options.publishing;
      if (publishing && !child.$publishable) {
        return;
      }
      const childDefinition = child.$serialize(options);
      if (childDefinition === undefined) {
        return;
      }
      definition[child.$getKey()] = childDefinition;
    });
  }

  _serializeExport(definition, options) {
    const exportResource = this.$getExport();
    if (exportResource) {
      const exportDefinition = exportResource.$serialize(options);
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
