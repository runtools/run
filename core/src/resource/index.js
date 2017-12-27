import {join, resolve, dirname, extname, isAbsolute} from 'path';
import {existsSync, unlinkSync} from 'fs';
import {homedir} from 'os';
import {isPlainObject, isEmpty, union, entries} from 'lodash';
import isDirectory from 'is-directory';
import {ensureDirSync, ensureFileSync} from 'fs-extra';
import {getProperty, takeProperty} from '@resdir/util';
import {
  catchContext,
  task,
  formatValue,
  formatString,
  formatPath,
  formatCode,
  print,
  printSuccess
} from '@resdir/console';
import {load, save} from '@resdir/file-manager';
import {validateResourceKey} from '@resdir/resource-key';
import {parseResourceIdentifier} from '@resdir/resource-identifier';
import {parseResourceSpecifier, stringifyResourceSpecifier} from '@resdir/resource-specifier';
import RegistryClient from '@resdir/registry-client';
import {shiftPositionalArguments} from '@resdir/expression';

import Runtime from '../runtime';

const RUN_CLIENT_ID = 'RUN_CLI';
const RUN_CLIENT_DIRECTORY = join(homedir(), '.run');

const RESOURCE_FILE_NAME = '@resource';
const RESOURCE_FILE_FORMATS = ['json', 'json5', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json';
const PRIVATE_DEV_RESOURCE_FILE_NAME = '@resource.dev.private';

const RESOURCE_HELPER_RESOURCE = 'resource/helper';
const RESDIR_REGISTRY_RESOURCE = 'resdir/registry';
const CONSOLE_TOOL_RESOURCE = 'tool/console';

export class Resource {
  static $RESOURCE_TYPE = 'resource';

  static $RESOURCE_NATIVE_CHILDREN = {
    '@parent': {
      '@description': 'Get the parent of the resource',
      '@getter': {
        '@type': 'method',
        '@output': {
          '@isOpen': true
        }
      }
    },
    '@console': {
      '@description': 'Shortcut to the console tool (tool/console)',
      '@getter': {
        '@type': 'method',
        '@output': {
          '@isOpen': true
        },
        '@run': `@import ${CONSOLE_TOOL_RESOURCE}`
      }
    },
    '@registry': {
      '@description': 'Shortcut to Resdir Registry (resdir/registry)',
      '@getter': {
        '@type': 'method',
        '@output': {
          '@isOpen': true
        },
        '@run': `@import ${RESDIR_REGISTRY_RESOURCE}`
      }
    },
    '@create': {
      '@type': 'method',
      '@description': 'Create a resource in the current directory',
      '@examples': ['@create array', '@create js/npm-package', '@create resdir/resource#^1.2.0'],
      '@input': {
        typeOrSpecifier: {
          '@type': 'string',
          '@description': 'Type or resource specifier',
          '@examples': ['array', 'js/npm-package', 'resdir/resource#^1.2.0'],
          '@position': 0
        }
      }
    },
    '@add': {
      '@type': 'method',
      '@description': 'Add a property',
      '@examples': [
        '@add string firstName',
        '@add js/esnext-transpiler transpiler',
        '@add aws/website#^1.2.0 frontend'
      ],
      '@input': {
        typeOrSpecifier: {
          '@type': 'string',
          '@description': 'Type or resource specifier',
          '@examples': ['string', 'js/esnext-transpiler', 'aws/website#^1.2.0'],
          '@position': 0
        },
        key: {
          '@type': 'string',
          '@description': 'Key of the property to add',
          '@examples': ['firstName', 'age', 'frontend'],
          '@position': 1
        }
      }
    },
    '@remove': {
      '@type': 'method',
      '@description': 'Remove a property',
      '@examples': ['@remove firstName', '@remove frontend'],
      '@aliases': ['@rm'],
      '@input': {
        key: {
          '@type': 'string',
          '@description': 'Key of the property to remove',
          '@examples': ['firstName', 'frontend'],
          '@position': 0
        }
      }
    },
    '@print': {
      '@type': 'method',
      '@description': 'Print resource\'s content',
      '@aliases': ['@p']
    },
    '@inspect': {
      '@type': 'method',
      '@description': 'Inspect resource\'s definition',
      '@aliases': ['@i']
    },
    '@install': {
      '@type': 'method',
      '@description': 'Broadcast an \'@install\' event',
      '@input': {
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@lint': {
      '@type': 'method',
      '@description': 'Broadcast a \'@lint\' event',
      '@input': {
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@test': {
      '@type': 'method',
      '@description': 'Broadcast a \'@test\' event',
      '@input': {
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@build': {
      '@type': 'method',
      '@description': 'Broadcast a \'@build\' event',
      '@input': {
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@load': {
      '@type': 'method',
      '@description': 'Load a resource',
      '@examples': ['@load resdir/example', '@load resdir/registry#^1.2.0'],
      '@input': {
        specifier: {
          '@type': 'string',
          '@description': 'Resource specifier',
          '@examples': ['resdir/example', 'resdir/registry#^1.2.0'],
          '@position': 0
        }
      },
      '@output': {
        '@isOpen': true
      }
    },
    '@import': {
      '@type': 'method',
      '@description': 'Import a resource',
      '@examples': ['@import tool/notifier', '@import tool/console#^1.2.0'],
      '@input': {
        specifier: {
          '@type': 'string',
          '@description': 'Resource specifier',
          '@examples': ['tool/notifier', 'tool/console#^1.2.0'],
          '@position': 0
        }
      },
      '@output': {
        '@isOpen': true
      }
    },
    '@emit': {
      '@type': 'method',
      '@description': 'Emit an event',
      '@examples': ['@emit websiteDeployed', '@emit build -- example.js --production'],
      '@input': {
        event: {
          '@type': 'string',
          '@description': 'Event name',
          '@examples': ['build', 'websiteDeployed'],
          '@position': 0
        },
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@broadcast': {
      '@type': 'method',
      '@description': 'Broadcast an event',
      '@examples': ['@broadcast websiteDeployed', '@broadcast build -- example.js --production'],
      '@input': {
        event: {
          '@type': 'string',
          '@description': 'Event name',
          '@examples': ['build', 'websiteDeployed'],
          '@position': 0
        },
        eventInput: {
          '@type': 'object',
          '@description': 'Input sent to event listeners',
          '@isOptional': true,
          '@isSubInput': true
        }
      }
    },
    '@normalize': {
      '@type': 'method',
      '@description': 'Normalize the current resource file',
      '@examples': ['@normalize', '@normalize --format=JSON5'],
      '@input': {
        format: {
          '@type': 'string',
          '@description': 'Preferred format',
          '@examples': ['JSON', 'JSON5'],
          '@default': 'JSON'
        }
      }
    },
    '@help': {
      '@type': 'method',
      '@description': 'Show resource\'s help',
      '@examples': ['@help', '@help frontend deploy', '@help @add'],
      '@aliases': ['@h'],
      '@input': {
        keys: {
          '@type': 'array',
          '@description': 'Key path to sub-resources, attributes or methods',
          '@position': 0,
          '@isOptional': true,
          '@isVariadic': true
        },
        showNative: {
          '@type': 'boolean',
          '@description': 'Show help for native attributes and methods',
          '@aliases': ['native'],
          '@isOptional': true
        }
      }
    },
    '@@help': {
      '@type': 'method',
      '@description': 'Show help for native attributes and methods',
      '@examples': ['@@help', '@@help keywords'],
      '@aliases': ['@@h'],
      '@input': {
        keys: {
          '@type': 'array',
          '@description': 'Key path to sub-resources, attributes or methods',
          '@position': 0,
          '@isOptional': true,
          '@isVariadic': true
        }
      }
    }
  };

  async $construct(
    definition,
    {bases = [], parent, key, directory, file, specifier, parse, isUnpublishable, isNative} = {}
  ) {
    this._bases = [];
    this._children = [];

    await catchContext(this, async () => {
      definition = {...definition};

      if (isNative) {
        this.$setIsNative(true);
      }

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

      if (specifier !== undefined) {
        this.$setResourceSpecifier(specifier);
      }

      if (isUnpublishable) {
        this.$setIsUnpublishable(true);
      }

      const set = (target, source, aliases) => {
        const value = takeProperty(definition, source, aliases);
        if (value !== undefined) {
          this[target] = value;
        }
      };

      set('$comment', '@comment');
      set('$type', '@type');
      set('$importAttribute', '@import');
      set('$loadAttribute', '@load');
      set('$directory', '@directory');
      set('$description', '@description');
      set('$aliases', '@aliases');
      set('$position', '@position');
      set('$isOptional', '@isOptional');
      set('$isVariadic', '@isVariadic');
      set('$isSubInput', '@isSubInput');
      set('$examples', '@examples');

      const getter = takeProperty(definition, '@getter');
      if (getter !== undefined) {
        await this.$setGetter(getter, {
          key,
          directory: this.$getCurrentDirectory({throwIfUndefined: false}),
          isNative
        });
      }

      set('$runtime', '@runtime');
      set('$implementation', '@implementation');
      set('$isHidden', '@isHidden');
      set('$autoBoxing', '@autoBoxing');
      set('$autoUnboxing', '@autoUnboxing');

      const isOpen = takeProperty(definition, '@isOpen');

      for (const base of bases) {
        await this._inherit(base);
      }

      const unpublishableDefinition = takeProperty(definition, '@unpublishable');
      const exportDefinition = takeProperty(definition, '@export');

      for (const key of Object.keys(definition)) {
        await this.$setChild(key, definition[key], {parse, isNative});
      }

      if (unpublishableDefinition !== undefined) {
        for (const [key, definition] of entries(unpublishableDefinition)) {
          await this.$setChild(key, definition, {parse, isUnpublishable: true, isNative});
        }
      }

      if (exportDefinition !== undefined) {
        const resource = await this.constructor.$create(exportDefinition, {
          directory: this.$getCurrentDirectory({throwIfUndefined: false}),
          specifier
        });
        this.$setExport(resource);
      }

      if (isOpen !== undefined) {
        this.$isOpen = isOpen;
      }
    });
  }

  /* eslint-disable complexity */

  static async $create(
    definition,
    {base, parent, key, directory, file, specifier, parse, isUnpublishable, isNative} = {}
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

    if (file) {
      directory = dirname(file);
    }

    const directoryAttribute = getProperty(normalizedDefinition, '@directory');
    if (directoryAttribute) {
      directory = resolve(directory, directoryAttribute);
    }

    let type = getProperty(normalizedDefinition, '@type');
    if (type !== undefined) {
      type = this.$normalizeType(type);
    }

    let loadAttribute = getProperty(normalizedDefinition, '@load');
    if (loadAttribute !== undefined) {
      loadAttribute = this.$normalizeLoadAttribute(loadAttribute);
    }

    let importAttribute = getProperty(normalizedDefinition, '@import');
    if (importAttribute !== undefined) {
      importAttribute = this.$normalizeImportAttribute(importAttribute);
    }

    if (
      type === undefined &&
      base === undefined &&
      loadAttribute === undefined &&
      importAttribute === undefined
    ) {
      if (normalizedDefinition['@value'] !== undefined) {
        type = inferType(normalizedDefinition['@value']);
      } else if (normalizedDefinition['@default'] !== undefined) {
        type = inferType(normalizedDefinition['@default']);
      }
    }

    let NativeClass;
    const bases = [];

    if (base) {
      bases.push(base);
      NativeClass = base._getNativeClass();
    } else {
      NativeClass = Resource;
    }

    if (type !== undefined) {
      const Class = getResourceClass(type);
      NativeClass = findSubclass(NativeClass, Class);
    }

    if (loadAttribute !== undefined) {
      const base = await Resource.$load(loadAttribute, {directory});
      bases.push(base);
      const Class = base._getNativeClass();
      NativeClass = findSubclass(NativeClass, Class);
    }

    if (importAttribute !== undefined) {
      for (const specifier of importAttribute) {
        const base = await Resource.$import(specifier, {directory});
        bases.push(base);
        const Class = base._getNativeClass();
        NativeClass = findSubclass(NativeClass, Class);
      }
    }

    await NativeClass._initializeResourceNativeChildren();

    let builders = [];
    for (const base of bases) {
      builders = union(builders, base._getClassBuilders());
    }

    const implementation = getProperty(normalizedDefinition, '@implementation');
    if (implementation) {
      if (loadAttribute) {
        throw new Error(`Can't have both ${formatCode('@load')} and ${formatCode('@implementation')} attributes`);
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

    const resource = new ResourceClass();
    await resource.$construct(normalizedDefinition, {
      bases,
      parent,
      key,
      directory,
      file,
      specifier,
      parse,
      isUnpublishable,
      isNative
    });

    return resource;
  }

  /* eslint-enable complexity */

  static async _initializeResourceNativeChildren() {
    if (Object.prototype.hasOwnProperty.call(this, '$RESOURCE_NATIVE_CHILDREN')) {
      if (Object.prototype.hasOwnProperty.call(this, '_resourceNativeChildren')) {
        return;
      }
      this._resourceNativeChildren = [];
      for (const [key, definition] of entries(this.$RESOURCE_NATIVE_CHILDREN)) {
        const child = await this.$create(definition, {key, isNative: true});
        child.$setCreator(this.prototype);
        this._resourceNativeChildren.push(child);
      }
    }
    if (this === Resource) {
      return;
    }
    const parent = Object.getPrototypeOf(this);
    await parent._initializeResourceNativeChildren();
  }

  static _getNativeChildren() {
    if (Object.prototype.hasOwnProperty.call(this, '_nativeChildren')) {
      return this._nativeChildren;
    }
    this._nativeChildren = [];
    if (Object.prototype.hasOwnProperty.call(this, '_resourceNativeChildren')) {
      this._nativeChildren.push(...this._resourceNativeChildren);
    }
    if (this !== Resource) {
      const parent = Object.getPrototypeOf(this);
      this._nativeChildren.unshift(...parent._getNativeChildren());
    }
    return this._nativeChildren;
  }

  static async $load(
    specifier,
    {directory, importing, searchInParentDirectories, throwIfNotFound = true} = {}
  ) {
    let result;

    if (isPlainObject(specifier)) {
      result = {definition: specifier};
      specifier = undefined;
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

    let {definition, file} = result;
    directory = result.directory;

    if (importing) {
      definition = getProperty(definition, '@export');
      if (definition === undefined) {
        throw new Error(`Can't import a resource without a ${formatCode('@export')} property`);
      }
    }

    const resource = await this.$create(definition, {file, directory, specifier});

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

    const {identifier, versionRange} = parseResourceSpecifier(specifier);
    const {namespace, name} = parseResourceIdentifier(identifier);

    const resourcesDirectory = process.env.RUN_LOCAL_RESOURCES;
    if (!resourcesDirectory || resourcesDirectory === '0') {
      return undefined;
    }

    const directory = join(resourcesDirectory, namespace, name);
    if (!existsSync(directory)) {
      return undefined;
    }

    const {definition, file} = await this._fetchFromLocation(directory);

    const version = definition.version;
    if (!versionRange.includes(version)) {
      return undefined;
    }

    return {definition, file};
  }

  static $getClientId() {
    return process.env.RUN_CLIENT_ID || RUN_CLIENT_ID;
  }

  $getClientId() {
    return this.constructor.$getClientId();
  }

  static $getClientDirectory() {
    return process.env.RUN_CLIENT_DIRECTORY || RUN_CLIENT_DIRECTORY;
  }

  $getClientDirectory() {
    return this.constructor.$getClientDirectory();
  }

  static $getRegistry() {
    if (!this._registry) {
      this._registry = new RegistryClient({
        registryURL: process.env.RESDIR_REGISTRY_URL,
        clientId: this.$getClientId(),
        clientDirectory: this.$getClientDirectory()
      });
    }
    return this._registry;
  }

  static async _fetchFromRegistry(specifier) {
    const registry = this.$getRegistry();
    const result = await registry.fetchResource(specifier);
    if (!result) {
      return undefined;
    }

    const {definition, directory} = result;

    const installedFlagFile = join(directory, '.installed');
    const installingFlagFile = join(directory, '.installing');
    if (!existsSync(installedFlagFile) && !existsSync(installingFlagFile)) {
      ensureFileSync(installingFlagFile);
      try {
        const idAndVersion = stringifyResourceSpecifier({
          identifier: definition.id,
          versionRange: definition.version
        });
        await task(
          async () => {
            const resource = await this.$create(definition, {directory});
            await resource['@install']();
            ensureFileSync(installedFlagFile);
          },
          {
            intro: `Installing ${formatString(idAndVersion)}...`,
            outro: `${formatString(idAndVersion)} installed`
          }
        );
      } finally {
        unlinkSync(installingFlagFile);
      }
    }

    return {definition, directory};
  }

  static async $import(specifier, {directory} = {}) {
    return await this.$load(specifier, {directory, importing: true});
  }

  async $extend(definition, options) {
    return await this.constructor.$create(definition, {...options, base: this});
  }

  $isDescendantOf(resource) {
    return resource instanceof Resource && Boolean(this.$findBase(base => base === resource));
  }

  $isAncestorOf(resource) {
    return resource instanceof Resource && Boolean(resource.$findBase(base => base === this));
  }

  async $save({directory, ensureDirectory} = {}) {
    await this.$emit('@save');

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

    await this.$emit('@saved');
  }

  async _inherit(base) {
    this._bases.push(base);
    await base.$forEachChildAsync(async child => {
      await this.$setChild(child.$getKey());
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
      if ((isSelf || deepSearch) && resource._bases) {
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

  _getInheritedValue(key, options) {
    let result;
    this.$forSelfAndEachBase(
      resource => {
        if (key in resource) {
          result = resource[key];
          return false;
        }
      },
      {skipSelf: options && options.skipSelf, deepSearch: true}
    );
    return result;
  }

  $getIsNative() {
    return this._isNative;
  }

  $setIsNative(isNative) {
    this._isNative = isNative;
  }

  $getParent() {
    return this._parent;
  }

  $setParent(parent) {
    this._parent = parent;
  }

  $getCreator() {
    return this._getInheritedValue('_creator');
  }

  $setCreator(creator) {
    this._creator = creator;
  }

  $getKey() {
    return this._key;
  }

  $setKey(key) {
    if (!this.$getIsNative()) {
      validateResourceKey(key);
    }
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

  $getResourceSpecifier() {
    return this._resourceSpecifier;
  }

  $setResourceSpecifier(specifier) {
    this._resourceSpecifier = specifier;
  }

  $getCurrentDirectory({throwIfUndefined = true} = {}) {
    let currentDirectory = this._currentDirectory;

    if (!currentDirectory) {
      const resourceFile = this.$getResourceFile();
      if (resourceFile) {
        currentDirectory = dirname(resourceFile);
      }
    }

    if (!currentDirectory) {
      if (throwIfUndefined) {
        throw new Error('Can\'t determine the current directory');
      }
      return undefined;
    }

    return currentDirectory;
  }

  $setCurrentDirectory(directory) {
    this._currentDirectory = directory;
  }

  $getIsUnpublishable() {
    return this._isUnpublishable;
  }

  $setIsUnpublishable(isUnpublishable) {
    this._isUnpublishable = isUnpublishable;
  }

  $getIsOpenByDefault() {
    const isOpenByDefault = this._getInheritedValue('_isOpenByDefault');
    return isOpenByDefault !== undefined ? isOpenByDefault : true;
  }

  $setIsOpenByDefault(isOpenByDefault) {
    if (isOpenByDefault !== undefined && typeof isOpenByDefault !== 'boolean') {
      throw new TypeError('\'isOpenByDefault\' argument must be a boolean');
    }
    this._isOpenByDefault = isOpenByDefault;
  }

  get $comment() {
    return this._comment;
  }

  set $comment(comment) {
    if (comment !== undefined && typeof comment !== 'string') {
      throw new TypeError(`${formatCode('@comment')} attribute must be a string`);
    }
    this._comment = comment;
  }

  get $type() {
    return this._type;
  }

  set $type(type) {
    if (type !== undefined) {
      type = this.constructor.$normalizeType(type);
    }
    this._type = type;
  }

  static $normalizeType(type) {
    if (typeof type !== 'string') {
      throw new TypeError(`${formatCode('@type')} attribute must be a string`);
    }
    return type;
  }

  get $loadAttribute() {
    return this._loadAttribute;
  }

  set $loadAttribute(loadAttribute) {
    if (loadAttribute !== undefined) {
      loadAttribute = this.constructor.$normalizeLoadAttribute(loadAttribute);
    }
    this._loadAttribute = loadAttribute;
  }

  static $normalizeLoadAttribute(loadAttribute) {
    if (typeof loadAttribute !== 'string' && !isPlainObject(loadAttribute)) {
      throw new Error(`Invalid ${formatCode('@load')} attribute value`);
    }
    return loadAttribute;
  }

  get $importAttribute() {
    return this._importAttribute;
  }

  set $importAttribute(importAttribute) {
    if (importAttribute !== undefined) {
      importAttribute = Resource.$normalizeImportAttribute(importAttribute);
    }
    this._importAttribute = importAttribute;
  }

  static $normalizeImportAttribute(importAttribute) {
    if (typeof importAttribute === 'string' || isPlainObject(importAttribute)) {
      importAttribute = [importAttribute];
    } else if (!Array.isArray(importAttribute)) {
      throw new Error(`Invalid ${formatCode('@import')} attribute value`);
    }
    return importAttribute;
  }

  get $directory() {
    return this._directory;
  }

  set $directory(directory) {
    if (directory !== undefined && typeof directory !== 'string') {
      throw new TypeError(`${formatCode('@directory')} attribute must be a string`);
    }
    this._directory = directory;
  }

  get $description() {
    return this._getInheritedValue('_description');
  }

  set $description(description) {
    if (description !== undefined && typeof description !== 'string') {
      throw new TypeError(`${formatCode('@description')} attribute must be a string`);
    }
    this._description = description;
  }

  get $aliases() {
    return this._getInheritedValue('_aliases');
  }

  set $aliases(aliases) {
    this._aliases = undefined;
    if (aliases !== undefined) {
      if (typeof aliases === 'string') {
        aliases = [aliases];
      }
      if (!Array.isArray(aliases)) {
        throw new TypeError(`${formatCode('@aliases')} attribute must be a string or an array of string`);
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
      throw new TypeError(`${formatCode('@position')} attribute must be a number`);
    }
    this._position = position;
  }

  get $isOptional() {
    return this._getInheritedValue('_isOptional');
  }

  set $isOptional(isOptional) {
    if (isOptional !== undefined && typeof isOptional !== 'boolean') {
      throw new TypeError(`${formatCode('@isOptional')} attribute must be a boolean`);
    }
    this._isOptional = isOptional;
  }

  get $isVariadic() {
    return this._getInheritedValue('_isVariadic');
  }

  set $isVariadic(isVariadic) {
    if (isVariadic !== undefined && typeof isVariadic !== 'boolean') {
      throw new TypeError(`${formatCode('@isVariadic')} attribute must be a boolean`);
    }
    this._isVariadic = isVariadic;
  }

  get $isSubInput() {
    return this._getInheritedValue('_isSubInput');
  }

  set $isSubInput(isSubInput) {
    if (isSubInput !== undefined && typeof isSubInput !== 'boolean') {
      throw new TypeError(`${formatCode('@isSubInput')} attribute must be a boolean`);
    }
    this._isSubInput = isSubInput;
  }

  get $examples() {
    return this._getInheritedValue('_examples');
  }

  set $examples(examples) {
    if (examples !== undefined && !Array.isArray(examples)) {
      examples = [examples];
    }
    this._examples = examples;
  }

  $getGetter() {
    return this._getInheritedValue('_getter');
  }

  async $setGetter(getter, {key, directory, isNative}) {
    if (getter === undefined) {
      this._getter = undefined;
      return;
    }
    this._getter = await this.constructor.$create(getter, {key, directory, isNative});
  }

  async $resolveGetter({parent} = {}) {
    const getter = this.$getGetter();
    if (!getter) {
      return this;
    }
    return await getter.$invoke(undefined, {parent});
  }

  get $runtime() {
    return this._getInheritedValue('_runtime');
  }

  set $runtime(runtime) {
    if (runtime !== undefined && typeof runtime !== 'string') {
      throw new TypeError(`${formatCode('@runtime')} attribute must be a string`);
    }
    this._runtime = runtime !== undefined ? new Runtime(runtime) : undefined;
  }

  get $implementation() {
    return this._implementation;
  }

  set $implementation(implementation) {
    if (implementation !== undefined && typeof implementation !== 'string') {
      throw new TypeError(`${formatCode('@implementation')} attribute must be a string`);
    }
    this._implementation = implementation;
  }

  get $isOpen() {
    const isOpen = this._getInheritedValue('_isOpen');
    return isOpen !== undefined ? isOpen : this.$getIsOpenByDefault();
  }

  set $isOpen(isOpen) {
    if (isOpen !== undefined && typeof isOpen !== 'boolean') {
      throw new TypeError(`${formatCode('@isOpen')} attribute must be a boolean`);
    }
    this._isOpen = isOpen;
  }

  get $isHidden() {
    return this._getInheritedValue('_isHidden');
  }

  set $isHidden(isHidden) {
    if (isHidden !== undefined && typeof isHidden !== 'boolean') {
      throw new TypeError(`${formatCode('@isHidden')} attribute must be a boolean`);
    }
    this._isHidden = isHidden;
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
    if (autoBoxing !== undefined && typeof autoBoxing !== 'boolean') {
      throw new TypeError(`${formatCode('@autoBoxing')} attribute must be a boolean`);
    }
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
    if (autoUnboxing !== undefined && typeof autoUnboxing !== 'boolean') {
      throw new TypeError(`${formatCode('@autoUnboxing')} attribute must be a boolean`);
    }
    this._autoUnboxing = autoUnboxing;
  }

  $getExport() {
    return this._export;
  }

  $setExport(resource) {
    this._export = resource;
  }

  $getType() {
    return this.constructor.$RESOURCE_TYPE;
  }

  static $isTypeIdentifier(identifier) {
    return Boolean(getResourceClass(identifier, {throwIfInvalid: false}));
  }

  $forEachChild(fn, {includeResourceChildren = true, includeNativeChildren} = {}) {
    if (includeResourceChildren) {
      const children = this._children;
      if (children) {
        const result = _forEachItems(children, fn);
        if (result === false) {
          return false;
        }
      }
    }

    if (includeNativeChildren) {
      const children = this.constructor._getNativeChildren();
      const result = _forEachItems(children, fn);
      if (result === false) {
        return false;
      }
    }
  }

  async $forEachChildAsync(fn, {includeNativeChildren} = {}) {
    for (const child of this.$getChildren({includeNativeChildren})) {
      const result = await fn(child);
      if (result === false) {
        return false;
      }
    }
  }

  $getChildren({includeNativeChildren} = {}) {
    const children = [];
    this.$forEachChild(child => children.push(child), {includeNativeChildren});
    return children;
  }

  $hasChildren({includeHiddenChildren = true} = {}) {
    let result = false;
    this.$forEachChild(child => {
      if (!includeHiddenChildren && child.$isHidden) {
        return;
      }
      result = true;
      return false;
    });
    return result;
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

  $findChild(key, {includeNativeChildren} = {}) {
    let result;
    this.$forEachChild(
      child => {
        if (child.$getKey() === key || child.$hasAlias(key)) {
          result = child;
          return false;
        }
      },
      {includeNativeChildren}
    );
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

  async $setChild(key, value, {parse, isUnpublishable, isNative} = {}) {
    const removedChildIndex = this.$removeChild(key);

    let child;

    const base = this.$getChildFromBases(key);

    if (!base && !this.$isOpen) {
      const err = new Error(`Child creation is not allowed (key: ${formatCode(key)})`);
      err.code = 'RUN_CORE_CHILD_CREATION_DENIED';
      err.childKey = key;
      throw err;
    }

    if (value instanceof Resource) {
      // TODO: Merge base and value
      child = await value.$extend();
      child.$setKey(key);
      child.$setParent(this);
    } else {
      child = await this.constructor.$create(value, {
        base,
        key,
        directory: this.$getCurrentDirectory({throwIfUndefined: false}),
        parent: this,
        parse,
        isUnpublishable,
        isNative: isNative || (base && base.$getIsNative())
      });
    }

    if (!base) {
      child.$setCreator(this);
    }

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
          throw new Error(`Can't change ${formatCode(key)} synchronously with an attribute setter. Please use the $setChild() asynchronous method.`);
        }
      },
      configurable: true
    });

    return child;
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

  async $invoke(expression, {_parent} = {}) {
    return await catchContext(this, async () => {
      expression = {...expression};

      const key = shiftPositionalArguments(expression);
      if (key === undefined) {
        return this;
      }

      let child = this.$findChild(key, {includeNativeChildren: true});
      if (!child) {
        throw new Error(`No attribute or method found with this key: ${formatCode(key)}`);
      }

      child = await child.$resolveGetter({parent: this});

      return await child.$invoke(expression, {parent: this});
    });
  }

  $print() {
    print(this.$format());
  }

  $format() {
    return formatValue(this.$serialize());
  }

  $inspect() {
    print(formatValue(this.$serialize()));
  }

  _getAllListeners() {
    if (!Object.prototype.hasOwnProperty.call(this, '_listeners')) {
      this._listeners = {};
      this.$forEachChild(child => {
        if (typeof child.$getAllListenedEvents === 'function') {
          for (const event of child.$getAllListenedEvents()) {
            if (!this._listeners[event]) {
              this._listeners[event] = [];
            }
            this._listeners[event].push(child);
          }
        }
      });
    }
    return this._listeners;
  }

  _getAllListenersForEvent(event) {
    return this._getAllListeners()[event] || [];
  }

  async $emit(event, eventInput = {}) {
    if (typeof event !== 'string') {
      throw new TypeError('\'event\' argument must be a string');
    }

    if (!isPlainObject(eventInput)) {
      throw new TypeError('\'eventInput\' argument must be a plain object');
    }

    for (const listener of this._getAllListenersForEvent(event)) {
      const fn = listener.$getFunction();
      await fn.call(this, eventInput);
    }
  }

  async $broadcast(event, eventInput) {
    await this.$emit(event, eventInput);
    await this.$forEachChildAsync(async child => {
      await child.$broadcast(event, eventInput);
    });
  }

  static async _getResourceHelper() {
    if (!this._resourceHelper) {
      this._resourceHelper = await Resource.$import(RESOURCE_HELPER_RESOURCE);
    }
    return this._resourceHelper;
  }

  async '@create'({typeOrSpecifier} = {}, environment) {
    if (!typeOrSpecifier) {
      throw new Error(`${formatCode('typeOrSpecifier')} input attribute is missing`);
    }

    let type;
    let specifier;
    if (getResourceClass(typeOrSpecifier, {throwIfInvalid: false})) {
      type = typeOrSpecifier;
    } else {
      specifier = typeOrSpecifier;
    }

    const resource = await task(
      async () => {
        const directory = process.cwd();

        const existingResource = await this.constructor.$load(directory, {throwIfNotFound: false});
        if (existingResource) {
          throw new Error(`A resource already exists in the current directory`);
        }

        const definition = {};
        if (specifier) {
          specifier = await this._pinResource(specifier);
          definition['@import'] = specifier;
        }
        if (type) {
          definition['@type'] = type;
        }

        const resource = await this.constructor.$create(definition, {directory});
        await resource.$emit('@created');
        await resource.$save();

        return resource;
      },
      {
        intro: `Creating resource...`,
        outro: `Resource created`
      },
      environment
    );

    return resource;
  }

  async '@add'({typeOrImport, key} = {}, environment) {
    if (!typeOrImport) {
      throw new Error(`${formatCode('typeOrImport')} input attribute is missing`);
    }

    let type;
    let specifier;
    if (getResourceClass(typeOrImport, {throwIfInvalid: false})) {
      type = typeOrImport;
    } else {
      specifier = typeOrImport;
    }

    if (!key) {
      throw new Error(`${formatCode('key')} input attribute is missing`);
    }

    let child = this.$getChild(key);
    if (child) {
      throw new Error(`A property with the same key (${formatCode(key)}) already exists`);
    }

    child = await task(
      async () => {
        const definition = {};
        if (specifier) {
          specifier = await this._pinResource(specifier);
          definition['@import'] = specifier;
        }
        if (type) {
          definition['@type'] = type;
        }

        child = await this.$setChild(key, definition);
        await child.$emit('@added');
        await this.$save();

        return child;
      },
      {
        intro: `Adding property...`,
        outro: `Property added`
      },
      environment
    );

    return child;
  }

  async '@remove'({key} = {}, environment) {
    if (!key) {
      throw new Error(`${formatCode('key')} input attribute is missing`);
    }

    const child = this.$getChild(key);
    if (!child) {
      throw new Error(`Property not found (key: ${formatCode(key)})`);
    }

    await task(
      async () => {
        await this.$removeChild(key);
        await this.$save();
      },
      {
        intro: `Removing property...`,
        outro: `Property removed`
      },
      environment
    );
  }

  async _pinResource(specifier) {
    const {identifier, versionRange, location} = parseResourceSpecifier(specifier);
    if (location) {
      return specifier;
    }
    if (versionRange.toJSON() === undefined) {
      const resource = await Resource.$load(identifier);
      if (resource.version) {
        specifier = stringifyResourceSpecifier({identifier, versionRange: '^' + resource.version});
      }
    }
    return specifier;
  }

  async '@parent'() {
    const parent = this.$getParent();
    if (!parent) {
      throw new Error(`${formatCode('@parent')} can't be invoked from the resource's root`);
    }
    return parent;
  }

  async '@print'() {
    this.$print();
  }

  async '@inspect'() {
    this.$inspect();
  }

  async '@install'({eventInput} = {}) {
    await this.$broadcast('@install', eventInput);
    await this.$broadcast('@installed', undefined);
  }

  async '@lint'({eventInput} = {}) {
    await this.$broadcast('@lint', eventInput);
    await this.$broadcast('@linted', undefined);
  }

  async '@test'({eventInput} = {}) {
    await this.$broadcast('@test', eventInput);
    await this.$broadcast('@tested', undefined);
  }

  async '@build'({eventInput} = {}) {
    await this.$broadcast('@build', eventInput);
    await this.$broadcast('@built', undefined);
  }

  async '@load'({specifier}) {
    if (!specifier) {
      throw new Error('\'specifier\' input attribute is missing');
    }
    return await this.constructor.$load(specifier, {directory: process.cwd()});
  }

  async '@import'({specifier}) {
    if (!specifier) {
      throw new Error('\'specifier\' input attribute is missing');
    }
    return await this.constructor.$import(specifier, {directory: process.cwd()});
  }

  async '@emit'({event, eventInput} = {}) {
    return await this.$emit(event, eventInput);
  }

  async '@broadcast'({event, eventInput} = {}) {
    return await this.$broadcast(event, eventInput);
  }

  async '@normalize'({format}) {
    // find . -name "@resource.json5" -exec run {} @normalize --json \;
    format = format.toUpperCase();

    const file = this.$getResourceFile();
    if (!file) {
      throw new Error('Resource file is undefined');
    }

    let newFile;
    const extension = extname(file);

    const convertToJSON = format === 'JSON' && extension !== '.json';
    if (convertToJSON) {
      newFile = file.slice(0, -extension.length) + '.json';
    }

    const convertToJSON5 = format === 'JSON5' && extension !== '.json5';
    if (convertToJSON5) {
      newFile = file.slice(0, -extension.length) + '.json5';
    }

    if (newFile) {
      this.$setResourceFile(newFile);
    }

    await this.$save();

    if (newFile) {
      unlinkSync(file);
    }

    printSuccess('Resource file normalized');
  }

  async '@help'({keys = [], showNative} = {}) {
    const helper = await this.constructor._getResourceHelper();
    const resourcePtr = this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.help({resourcePtr, keys, showNative});
  }

  async '@@help'({keys}) {
    return await this['@help']({keys, showNative: true});
  }

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw new Error('Invalid resource definition');
    }
    return definition;
  }

  $serialize(options) {
    let definition = {};

    if (this._comment !== undefined) {
      definition['@comment'] = this._comment;
    }

    if (this._type !== undefined) {
      definition['@type'] = this._type;
    }

    if (this._loadAttribute !== undefined) {
      definition['@load'] = this._loadAttribute;
    }

    this._serializeImportAttribute(definition, options);

    if (this._directory !== undefined) {
      definition['@directory'] = this._directory;
    }

    if (this._description !== undefined) {
      definition['@description'] = this._description;
    }

    this._serializeAliases(definition, options);

    if (this._position !== undefined) {
      definition['@position'] = this._position;
    }

    if (this._isOptional !== undefined) {
      definition['@isOptional'] = this._isOptional;
    }

    if (this._isVariadic !== undefined) {
      definition['@isVariadic'] = this._isVariadic;
    }

    if (this._isSubInput !== undefined) {
      definition['@isSubInput'] = this._isSubInput;
    }

    this._serializeExamples(definition, options);

    this._serializeGetter(definition, options);

    if (this._runtime !== undefined) {
      definition['@runtime'] = this._runtime.toJSON();
    }

    if (this._implementation !== undefined) {
      definition['@implementation'] = this._implementation;
    }

    if (this._isOpen !== undefined) {
      definition['@isOpen'] = this._isOpen;
    }

    if (this._isHidden !== undefined) {
      definition['@isHidden'] = this._isHidden;
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

  _serializeImportAttribute(definition, _options) {
    const importAttribute = this._importAttribute;
    if (importAttribute !== undefined) {
      if (importAttribute.length === 1) {
        definition['@import'] = importAttribute[0];
      } else if (importAttribute.length > 1) {
        definition['@import'] = importAttribute;
      }
    }
  }

  _serializeAliases(definition, _options) {
    let aliases = this._aliases;
    if (aliases !== undefined) {
      aliases = Array.from(aliases);
      if (aliases.length > 0) {
        definition['@aliases'] = aliases;
      }
    }
  }

  _serializeExamples(definition, _options) {
    const examples = this._examples;
    if (examples && examples.length > 0) {
      definition['@examples'] = examples;
    }
  }

  _serializeGetter(definition, _options) {
    const getter = this._getter;
    if (getter) {
      definition['@getter'] = getter.$serialize();
    }
  }

  _serializeChildren(definition, options) {
    const publishing = options && options.publishing;

    const unpublishableDefinition = {};

    this.$forEachChild(child => {
      const isUnpublishable = child.$getIsUnpublishable();
      if (publishing && isUnpublishable) {
        return;
      }
      const childDefinition = child.$serialize(options);
      if (childDefinition === undefined) {
        return;
      }
      if (isUnpublishable) {
        unpublishableDefinition[child.$getKey()] = childDefinition;
      } else {
        definition[child.$getKey()] = childDefinition;
      }
    });

    if (!isEmpty(unpublishableDefinition)) {
      definition['@unpublishable'] = unpublishableDefinition;
    }
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

function _forEachItems(items, fn) {
  if (!Array.isArray(items)) {
    throw new TypeError('\'items\' argument must be an array');
  }

  if (typeof fn !== 'function') {
    throw new TypeError('\'fn\' argument must be a function');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = fn(item, i);
    if (result === false) {
      return false;
    }
  }
}

function findSubclass(A, B) {
  if (A === B || Object.prototype.isPrototypeOf.call(B, A)) {
    return A;
  }
  if (Object.prototype.isPrototypeOf.call(A, B)) {
    return B;
  }
  throw new Error(`Can't mix a ${A.name} with a ${B.name}`);
}

function searchResourceFile(directoryOrFile, {searchInParentDirectories = false} = {}) {
  let directory;

  if (isDirectory.sync(directoryOrFile)) {
    directory = directoryOrFile;
  }

  if (!directory) {
    if (existsSync(directoryOrFile)) {
      const file = directoryOrFile;
      const extension = extname(file).slice(1);
      if (RESOURCE_FILE_FORMATS.includes(extension)) {
        return file;
      }
    }
    return undefined;
  }

  for (const format of RESOURCE_FILE_FORMATS) {
    let file = join(directory, PRIVATE_DEV_RESOURCE_FILE_NAME + '.' + format);
    if (existsSync(file)) {
      return file;
    }
    file = join(directory, RESOURCE_FILE_NAME + '.' + format);
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
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (isPlainObject(value)) {
    return 'object';
  }
  if (Buffer.isBuffer(value)) {
    return 'binary';
  }
  throw new Error('Cannot infer the type from @value or @default');
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
    if (process.env.DEBUG) {
      console.warn(`An error occured while loading implementation (file: ${formatPath(file)}): ${err.message}`);
    }
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

function getResourceClass(type, {throwIfInvalid = true} = {}) {
  switch (type) {
    case 'resource':
      return Resource;
    case 'boolean':
      return require('./boolean').default;
    case 'number':
      return require('./number').default;
    case 'string':
      return require('./string').default;
    case 'array':
      return require('./array').default;
    case 'object':
      return require('./object').default;
    case 'binary':
      return require('./binary').default;
    case 'method':
      return require('./method').default;
    case 'environment':
      return require('./environment').default;
    case 'pointer':
      return require('./pointer').default;
    default:
      if (throwIfInvalid) {
        throw new Error(`Type ${formatString(type)} is invalid`);
      }
  }
}

export default Resource;
