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
  formatURL,
  print
} from '@resdir/console';
import {load, save} from '@resdir/file-manager';
import {validateResourceKey} from '@resdir/resource-key';
import {parseResourceIdentifier} from '@resdir/resource-identifier';
import {parseResourceSpecifier, stringifyResourceSpecifier} from '@resdir/resource-specifier';
import ResourceFetcher from '@resdir/resource-fetcher';
import {shiftPositionalArguments} from '@resdir/expression';
import {createClientError} from '@resdir/error';
import decache from 'decache';

import Runtime from '../runtime';
import RemoteResource from './remote';

const RUN_CLIENT_ID = process.env.RUN_CLIENT_ID || 'RUN_CLI';
const RUN_CLIENT_DIRECTORY = process.env.RUN_CLIENT_DIRECTORY || join(homedir(), '.run');
const RUN_LOCAL_RESOURCES = process.env.RUN_LOCAL_RESOURCES;

const RESDIR_REGISTRY_CLIENT = process.env.RESDIR_REGISTRY_CLIENT || 'resdir/registry-client';
const RESDIR_REGISTRY_SERVER = process.env.RESDIR_REGISTRY_SERVER || 'https://registry.resdir.com';
const RESDIR_UPLOAD_SERVER_S3_BUCKET_NAME =
  process.env.RESDIR_UPLOAD_SERVER_S3_BUCKET_NAME || 'resdir-registry-v1';
const RESDIR_UPLOAD_SERVER_S3_KEY_PREFIX =
  process.env.RESDIR_UPLOAD_SERVER_S3_KEY_PREFIX || 'resources/uploads/';

const RESOURCE_FILE_NAME = '@resource';
const RESOURCE_FILE_FORMATS = ['json', 'json5', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json';
const PRIVATE_DEV_RESOURCE_FILE_NAME = '@resource.dev.private';

const BOOTSTRAPPING_RESOURCES = [
  'js/resource',
  'js/npm-dependencies',
  'resdir/resource',
  'resdir/registry-client'
];

const RESOURCE_HELPER = 'resource/helper';
const TOOL_CONSOLE = 'tool/console';

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
        '@run': `@import ${TOOL_CONSOLE}`
      }
    },
    '@registry': {
      '@description': 'Shortcut to Resdir Registry client (resdir/registry-client)',
      '@getter': {
        '@type': 'method',
        '@output': {
          '@isOpen': true
        }
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
      '@description': 'Add a property to the current resource',
      '@examples': [
        '@add string firstName',
        '@add js/transpiler transpiler',
        '@add aws/website#^1.2.0 frontend'
      ],
      '@input': {
        typeOrSpecifier: {
          '@type': 'string',
          '@description': 'Type or resource specifier of the property to add',
          '@examples': ['string', 'js/transpiler', 'aws/website#^1.2.0'],
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
      '@description': 'Remove a property from the current resource',
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
      '@description': 'Normalize the file of the current resource',
      '@examples': ['@normalize', '@normalize --format=JSON5'],
      '@input': {
        format: {
          '@type': 'string',
          '@description': 'Preferred format',
          '@examples': ['JSON', 'JSON5', 'YAML'],
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
    {
      bases = [],
      parent,
      key,
      directory,
      file,
      implementationFile,
      specifier,
      parse,
      isUnpublishable,
      isNative,
      disableCache
    } = {}
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

      if (implementationFile !== undefined) {
        this.$setImplementationFile(implementationFile);
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
          isNative,
          disableCache
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
        await this.$setChild(key, definition[key], {parse, isNative, disableCache});
      }

      if (unpublishableDefinition !== undefined) {
        for (const [key, definition] of entries(unpublishableDefinition)) {
          await this.$setChild(key, definition, {
            parse,
            isUnpublishable: true,
            isNative,
            disableCache
          });
        }
      }

      if (exportDefinition !== undefined) {
        const base = this.$getExport({considerBases: true});
        const resource = await this.constructor.$create(exportDefinition, {
          base,
          directory: this.$getCurrentDirectory({throwIfUndefined: false}),
          specifier,
          disableCache
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
    {
      base,
      parent,
      key,
      directory,
      file,
      specifier,
      parse,
      isUnpublishable,
      isNative,
      disableCache
    } = {}
  ) {
    // TODO: Reimplement from scratch
    // Don't waste time improving (or even understanding) this part, it will be completely rewritten.
    // The plan is to use Proxy to virtualize resource's attributes and methods.

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

    let BaseClass;
    const bases = [];

    if (base) {
      bases.push(base);
      BaseClass = base.constructor;
    } else {
      BaseClass = Resource;
    }

    if (type !== undefined) {
      const Class = getResourceClass(type);
      BaseClass = findSubclass(BaseClass, Class);
    }

    if (loadAttribute !== undefined) {
      const base = await Resource.$load(loadAttribute, {directory, disableCache});
      bases.push(base);
      const Class = base.constructor;
      BaseClass = findSubclass(BaseClass, Class);
    }

    if (importAttribute !== undefined) {
      for (const specifier of importAttribute) {
        const base = await Resource.$import(specifier, {directory, disableCache});
        bases.push(base);
        const Class = base.constructor;
        BaseClass = findSubclass(BaseClass, Class);
      }
    }

    await BaseClass._initializeResourceNativeChildren();

    let builders = [];
    for (const base of bases) {
      builders = union(builders, base._getBuilders());
    }

    let implementationFile;

    const implementationAttribute = getProperty(normalizedDefinition, '@implementation');
    if (implementationAttribute) {
      implementationFile = implementationAttribute;

      if (!isAbsolute(implementationFile)) {
        implementationFile = resolve(directory, implementationFile);
      }

      const foundFile = searchImplementationFile(implementationFile);
      if (foundFile) {
        implementationFile = foundFile;
        const builder = requireImplementation(implementationFile, {disableCache});
        if (builder && !builders.includes(builder)) {
          builders.push(builder);
        }
      } else {
        builders.push(() => {
          throw createClientError(`Resource implementation file not found (file: ${formatPath(implementationFile)})`);
        });
      }
    }

    let resource = new BaseClass();
    let implementation;

    for (const builder of builders) {
      try {
        implementation = await builder(Resource);
        if (!isPlainObject(implementation)) {
          throw createClientError(`A resource implementation builder must return a plain object (file: ${formatPath(builder.file)})`);
        }
      } catch (err) {
        implementation = {__buildError__: err};
      }
      implementation._builder = builder;
      Object.setPrototypeOf(implementation, resource);
      resource = implementation;
    }

    if (implementation) {
      resource = Object.create(resource);
      resource.constructor = BaseClass;
      resource._implementation = implementation;
    }

    normalizedDefinition = BaseClass.$normalize(definition, {parse});

    await resource.$construct(normalizedDefinition, {
      bases,
      parent,
      key,
      directory,
      file,
      implementationFile,
      specifier,
      parse,
      isUnpublishable,
      isNative,
      disableCache
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

  _getBuilders() {
    const builders = [];
    let resource = this;
    while (true) {
      // OPTIMIZE
      const builder = resource._builder;
      if (!builder) {
        break;
      }
      if (!builders.includes(builder)) {
        builders.unshift(builder);
      }
      resource = Object.getPrototypeOf(resource);
    }
    return builders;
  }

  static async $load(
    specifier,
    {directory, importing, searchInParentDirectories, disableCache, throwIfNotFound = true} = {}
  ) {
    let result;

    if (isPlainObject(specifier)) {
      result = {definition: specifier};
      specifier = undefined;
    } else {
      const {location} = parseResourceSpecifier(specifier);
      if (location) {
        if (location.match(/^https?:\/\//i)) {
          // TODO: Make it right
          if (!importing) {
            throw createClientError(`Remote resource '@load' is not implemented yet, only '@import' is supported (location: ${formatURL(location)})`);
          }
          return await RemoteResource.$import(location);
        }
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
        throw createClientError(`Resource not found (specifier: ${formatString(specifier)}, directory: ${formatPath(directory)})`);
      }
      return undefined;
    }

    let base;
    let {definition, file} = result;

    if (importing) {
      // TODO: Allow circular references when loading resources,
      // so we can remove this ugly code

      const loadAttribute = getProperty(definition, '@load');
      if (loadAttribute) {
        base = await this.$import(loadAttribute, {directory: dirname(file), disableCache});
      }

      definition = getProperty(definition, '@export');
      if (definition === undefined) {
        throw createClientError(`Can't import a resource without an ${formatCode('@export')} property (specifier: ${formatString(specifier)}, directory: ${formatPath(directory)})`);
      }
    }

    const resource = await this.$create(definition, {
      base,
      file,
      directory,
      specifier,
      disableCache
    });

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

    const resourcesDirectory = RUN_LOCAL_RESOURCES;
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
    return RUN_CLIENT_ID;
  }

  $getClientId() {
    return this.constructor.$getClientId();
  }

  static $getClientDirectory() {
    return RUN_CLIENT_DIRECTORY;
  }

  $getClientDirectory() {
    return this.constructor.$getClientDirectory();
  }

  static async $getRegistryClient() {
    if (!this._registryClient) {
      this._registryClient = await this.$create({
        '@import': RESDIR_REGISTRY_CLIENT,
        registryServer: RESDIR_REGISTRY_SERVER,
        uploadServer: {
          type: 'AWS_S3',
          config: {
            bucketName: RESDIR_UPLOAD_SERVER_S3_BUCKET_NAME,
            keyPrefix: RESDIR_UPLOAD_SERVER_S3_KEY_PREFIX
          }
        }
      });
    }
    return this._registryClient;
  }

  static async $getRegistryServer() {
    if (!this._registryServer) {
      this._registryServer = await this.$import(RESDIR_REGISTRY_SERVER);
    }
    return this._registryServer;
  }

  static async $getResourceFetcher() {
    if (!this._resourceFetcher) {
      this._resourceFetcher = new ResourceFetcher({
        registryServer: await this.$getRegistryServer(),
        clientDirectory: this.$getClientDirectory()
      });
    }
    return this._resourceFetcher;
  }

  static async _fetchFromRegistry(specifier) {
    let result;
    const {identifier} = parseResourceSpecifier(specifier);
    if (BOOTSTRAPPING_RESOURCES.includes(identifier)) {
      const resourceFetcher = await this.$getResourceFetcher();
      result = await resourceFetcher.fetch({specifier});
    } else {
      const registryClient = await this.$getRegistryClient();
      result = await registryClient.resources.fetch({specifier});
    }
    const {file} = result;
    const definition = load(file);

    const directory = dirname(file);
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

    return {definition, file};
  }

  static async $import(specifier, {directory, disableCache} = {}) {
    return await this.$load(specifier, {directory, importing: true, disableCache});
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

  $getImplementationFile({considerBases} = {}) {
    return considerBases ?
      this._getInheritedValue('_implementationFile') :
      this._implementationFile;
  }

  $setImplementationFile(file) {
    this._implementationFile = file;
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
      throw createClientError('\'isOpenByDefault\' argument must be a boolean');
    }
    this._isOpenByDefault = isOpenByDefault;
  }

  get $comment() {
    return this._comment;
  }

  set $comment(comment) {
    if (comment !== undefined && typeof comment !== 'string') {
      throw createClientError(`${formatCode('@comment')} attribute must be a string`);
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
      throw createClientError(`${formatCode('@type')} attribute must be a string`);
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
      throw createClientError(`Invalid ${formatCode('@load')} attribute value`);
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
      throw createClientError(`Invalid ${formatCode('@import')} attribute value`);
    }
    return importAttribute;
  }

  get $directory() {
    return this._directory;
  }

  set $directory(directory) {
    if (directory !== undefined && typeof directory !== 'string') {
      throw createClientError(`${formatCode('@directory')} attribute must be a string`);
    }
    this._directory = directory;
  }

  get $description() {
    return this._getInheritedValue('_description');
  }

  set $description(description) {
    if (description !== undefined && typeof description !== 'string') {
      throw createClientError(`${formatCode('@description')} attribute must be a string`);
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
        throw createClientError(`${formatCode('@aliases')} attribute must be a string or an array of string`);
      }
      for (const alias of aliases) {
        this.$addAlias(alias);
      }
    }
  }

  $addAlias(alias) {
    if (!this.$getIsNative()) {
      validateResourceKey(alias);
    }
    if (!this._aliases) {
      this._aliases = [];
    }
    if (!this._aliases.includes(alias)) {
      this._aliases.push(alias);
    }
  }

  $hasAlias(alias) {
    const aliases = this.$aliases;
    return Boolean(aliases && aliases.includes(alias));
  }

  get $position() {
    return this._getInheritedValue('_position');
  }

  set $position(position) {
    if (position !== undefined && typeof position !== 'number') {
      throw createClientError(`${formatCode('@position')} attribute must be a number`);
    }
    this._position = position;
  }

  get $isOptional() {
    return this._getInheritedValue('_isOptional');
  }

  set $isOptional(isOptional) {
    if (isOptional !== undefined && typeof isOptional !== 'boolean') {
      throw createClientError(`${formatCode('@isOptional')} attribute must be a boolean`);
    }
    this._isOptional = isOptional;
  }

  get $isVariadic() {
    return this._getInheritedValue('_isVariadic');
  }

  set $isVariadic(isVariadic) {
    if (isVariadic !== undefined && typeof isVariadic !== 'boolean') {
      throw createClientError(`${formatCode('@isVariadic')} attribute must be a boolean`);
    }
    this._isVariadic = isVariadic;
  }

  get $isSubInput() {
    return this._getInheritedValue('_isSubInput');
  }

  set $isSubInput(isSubInput) {
    if (isSubInput !== undefined && typeof isSubInput !== 'boolean') {
      throw createClientError(`${formatCode('@isSubInput')} attribute must be a boolean`);
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

  async $setGetter(getter, {key, directory, isNative, disableCache}) {
    if (getter === undefined) {
      this._getter = undefined;
      return;
    }
    this._getter = await this.constructor.$create(getter, {key, directory, isNative, disableCache});
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
      throw createClientError(`${formatCode('@runtime')} attribute must be a string`);
    }
    this._runtime = runtime !== undefined ? new Runtime(runtime) : undefined;
  }

  get $implementation() {
    return this._implementationAttribute;
  }

  set $implementation(implementation) {
    if (implementation !== undefined && typeof implementation !== 'string') {
      throw createClientError(`${formatCode('@implementation')} attribute must be a string`);
    }
    this._implementationAttribute = implementation;
  }

  get $isOpen() {
    const isOpen = this._getInheritedValue('_isOpen');
    return isOpen !== undefined ? isOpen : this.$getIsOpenByDefault();
  }

  set $isOpen(isOpen) {
    if (isOpen !== undefined && typeof isOpen !== 'boolean') {
      throw createClientError(`${formatCode('@isOpen')} attribute must be a boolean`);
    }
    this._isOpen = isOpen;
  }

  get $isHidden() {
    return this._getInheritedValue('_isHidden');
  }

  set $isHidden(isHidden) {
    if (isHidden !== undefined && typeof isHidden !== 'boolean') {
      throw createClientError(`${formatCode('@isHidden')} attribute must be a boolean`);
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
      throw createClientError(`${formatCode('@autoBoxing')} attribute must be a boolean`);
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
      throw createClientError(`${formatCode('@autoUnboxing')} attribute must be a boolean`);
    }
    this._autoUnboxing = autoUnboxing;
  }

  $getExport({considerBases} = {}) {
    return considerBases ? this._getInheritedValue('_export') : this._export;
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

  async $setChild(key, value, {parse, isUnpublishable, isNative, disableCache} = {}) {
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
        isNative: isNative || (base && base.$getIsNative()),
        disableCache
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
          throw createClientError(`Can't change ${formatCode(key)} synchronously with an attribute setter. Please use the $setChild() asynchronous method.`);
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
        throw createClientError(`No attribute or method found with this key: ${formatCode(key)}`);
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

  async '@parent'() {
    const parent = this.$getParent();
    if (!parent) {
      throw createClientError(`${formatCode('@parent')} can't be invoked from the resource's root`);
    }
    return parent;
  }

  async '@registry'() {
    return await this.constructor.$getRegistryClient();
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
      throw createClientError('\'specifier\' input attribute is missing');
    }
    return await this.constructor.$load(specifier, {directory: process.cwd()});
  }

  async '@import'({specifier}) {
    if (!specifier) {
      throw createClientError('\'specifier\' input attribute is missing');
    }
    return await this.constructor.$import(specifier, {directory: process.cwd()});
  }

  async '@emit'({event, eventInput} = {}) {
    return await this.$emit(event, eventInput);
  }

  async '@broadcast'({event, eventInput} = {}) {
    return await this.$broadcast(event, eventInput);
  }

  async '@create'({typeOrSpecifier}, environment) {
    const helper = await this.constructor._getResourceHelper();
    await helper.create({typeOrSpecifier}, environment);
  }

  async '@add'({typeOrSpecifier, key}, environment) {
    const helper = await this.constructor._getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.add({resourcePtr, typeOrSpecifier, key}, environment);
  }

  async '@remove'({key}, environment) {
    const helper = await this.constructor._getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.remove({resourcePtr, key}, environment);
  }

  async '@normalize'({format}, environment) {
    const helper = await this.constructor._getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.normalize({resourcePtr, format}, environment);
  }

  async '@help'({keys, showNative}, environment) {
    const helper = await this.constructor._getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.help({resourcePtr, keys, showNative}, environment);
  }

  async '@@help'({keys}, environment) {
    return await this['@help']({keys, showNative: true}, environment);
  }

  static async _getResourceHelper() {
    if (!this._resourceHelper) {
      this._resourceHelper = await Resource.$import(RESOURCE_HELPER);
    }
    return this._resourceHelper;
  }

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw createClientError('Invalid resource definition');
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

    if (this._implementationAttribute !== undefined) {
      definition['@implementation'] = this._implementationAttribute;
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

    if (options && options.isChild && isEmpty(definition)) {
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
    const aliases = this._aliases;
    if (aliases && aliases.length > 0) {
      definition['@aliases'] = aliases;
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
      const childDefinition = child.$serialize({...options, isChild: true});
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
    const exportResource = this._export;
    if (exportResource) {
      const exportDefinition = exportResource.$serialize(options);
      if (exportDefinition) {
        definition['@export'] = exportDefinition;
      }
    }
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
  throw createClientError('Cannot infer the type from @value or @default');
}

function requireImplementation(file, {disableCache} = {}) {
  let implementation;

  try {
    if (disableCache) {
      decache(file);
    }

    implementation = require(file);
    if (implementation.default) {
      // ES Module
      implementation = implementation.default;
    }

    if (typeof implementation !== 'function') {
      throw createClientError(`A resource implementation file must export a function (file: ${formatPath(file)})`);
    }
  } catch (err) {
    implementation = () => {
      throw err;
    };
  }

  implementation.file = file;

  return implementation;
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
        throw createClientError(`Type ${formatString(type)} is invalid`);
      }
  }
}

export default Resource;
