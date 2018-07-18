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
import {
  parseResourceSpecifier,
  stringifyResourceSpecifier,
  isResourceSpecifier
} from '@resdir/resource-specifier';
import {validateResourceName} from '@resdir/resource-name';
import {validateResourceDescription} from '@resdir/resource-description';
import ResourceFetcher from '@resdir/resource-fetcher';
import {
  shiftPositionalArguments,
  isParsedExpression,
  matchExpression,
  takeArgument
} from '@resdir/expression';
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
  process.env.RESDIR_UPLOAD_SERVER_S3_BUCKET_NAME || 'resdir-registry-prod-v1';
const RESDIR_UPLOAD_SERVER_S3_KEY_PREFIX =
  process.env.RESDIR_UPLOAD_SERVER_S3_KEY_PREFIX || 'resources/uploads/';

const RESOURCE_FILE_NAME = '@resource';
const PRIVATE_RESOURCE_SUFFIX = '.private';
const RESOURCE_FILE_FORMATS = ['json', 'json5', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json';

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
      '@aliases': ['@reg', '@r'],
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
        '@add aws/s3-hosted-website#^1.2.0 frontend'
      ],
      '@input': {
        typeOrSpecifier: {
          '@type': 'string',
          '@description': 'Type or resource specifier of the property to add',
          '@examples': ['string', 'js/transpiler', 'aws/s3-hosted-website#^1.2.0'],
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
    '@repl': {
      '@type': 'method',
      '@description': 'Start a REPL session'
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
      '@description': 'Emit an event to a resource',
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
      '@description': 'Emit an event to a resource and all its child resources',
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
    '@version': {
      '@type': 'method',
      '@description': 'Display Run\'s version'
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
        showBuiltIn: {
          '@type': 'boolean',
          '@description': 'Show help for built-in methods',
          '@aliases': ['builtIn', 'built'],
          '@isOptional': true
        }
      }
    },
    '@@help': {
      '@type': 'method',
      '@description': 'Show help for built-in methods',
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
      exporterDefinition,
      disableCache
    } = {}
  ) {
    this._$bases = [];
    this._$children = [];

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

      if (exporterDefinition) {
        this.$setExporterDefinition(exporterDefinition);
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
      set('$name', '@name');
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
        await this._$inherit(base);
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
      exporterDefinition,
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

    await BaseClass._$initializeResourceNativeChildren();

    let builders = [];
    for (const base of bases) {
      builders = union(builders, base._$getBuilders());
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
          throw createClientError(
            `Resource implementation file not found (file: ${formatPath(implementationFile)})`
          );
        });
      }
    }

    let resource = new BaseClass();
    let implementation;

    for (const builder of builders) {
      try {
        implementation = await builder(Resource);
        if (!isPlainObject(implementation)) {
          throw createClientError(
            `A resource implementation builder must return a plain object (file: ${formatPath(
              builder.file
            )})`
          );
        }
      } catch (err) {
        implementation = {_$buildError: err};
      }
      implementation._$builder = builder;
      Object.setPrototypeOf(implementation, resource);
      resource = implementation;
    }

    if (implementation) {
      resource = Object.create(resource);
      resource.constructor = BaseClass;
      resource._$implementation = implementation;
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
      exporterDefinition,
      disableCache
    });

    return resource;
  }

  /* eslint-enable complexity */

  static async _$initializeResourceNativeChildren() {
    if (Object.prototype.hasOwnProperty.call(this, '$RESOURCE_NATIVE_CHILDREN')) {
      if (Object.prototype.hasOwnProperty.call(this, '_$resourceNativeChildren')) {
        return;
      }
      this._$resourceNativeChildren = [];
      for (const [key, definition] of entries(this.$RESOURCE_NATIVE_CHILDREN)) {
        const child = await this.$create(definition, {key, isNative: true});
        child.$setCreator(this.prototype);
        this._$resourceNativeChildren.push(child);
      }
    }
    if (this === Resource) {
      return;
    }
    const parent = Object.getPrototypeOf(this);
    await parent._$initializeResourceNativeChildren();
  }

  static _$getNativeChildren() {
    if (Object.prototype.hasOwnProperty.call(this, '_$nativeChildren')) {
      return this._$nativeChildren;
    }
    this._$nativeChildren = [];
    if (Object.prototype.hasOwnProperty.call(this, '_$resourceNativeChildren')) {
      this._$nativeChildren.push(...this._$resourceNativeChildren);
    }
    if (this !== Resource) {
      const parent = Object.getPrototypeOf(this);
      this._$nativeChildren.unshift(...parent._$getNativeChildren());
    }
    return this._$nativeChildren;
  }

  _$getBuilders() {
    const builders = [];
    let resource = this;
    while (true) {
      // OPTIMIZE
      const builder = resource._$builder;
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
    {
      directory,
      stage,
      isImporting,
      searchInParentDirectories,
      disableCache,
      throwIfNotFound = true
    } = {}
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
          if (!isImporting) {
            throw createClientError(
              `Remote resource '@load' is not implemented yet, only '@import' is supported (location: ${formatURL(
                location
              )})`
            );
          }
          return await RemoteResource.$import(location);
        }
        result = await this._$fetchFromLocation(location, {
          directory,
          stage,
          searchInParentDirectories
        });
      } else {
        result = await this._$fetchFromLocalResources(specifier);
        if (!result) {
          result = await this._$fetchFromRegistry(specifier);
        }
      }
    }

    if (!result) {
      if (throwIfNotFound) {
        throw createClientError(
          `Resource not found (specifier: ${formatString(specifier)}, directory: ${formatPath(
            directory
          )})`
        );
      }
      return undefined;
    }

    let base;
    let {definition, file} = result;
    let exporterDefinition; // TODO: Should disappear with a proper implementation

    if (isImporting) {
      // TODO: Allow circular references when loading resources,
      // so we can remove this ugly code

      const loadAttribute = getProperty(definition, '@load');
      if (loadAttribute) {
        base = await this.$import(loadAttribute, {directory: dirname(file), disableCache});
      }

      exporterDefinition = definition;
      definition = getProperty(definition, '@export');
      if (definition === undefined) {
        throw createClientError(
          `Can't import a resource without an ${formatCode(
            '@export'
          )} property (specifier: ${formatString(specifier)}, directory: ${formatPath(directory)})`
        );
      }
    }

    const resource = await this.$create(definition, {
      base,
      file,
      directory,
      specifier,
      exporterDefinition,
      disableCache
    });

    return resource;
  }

  static async _$fetchFromLocation(location, {directory, stage, searchInParentDirectories} = {}) {
    let file = location;
    if (file.startsWith('.')) {
      if (!directory) {
        throw new Error('\'directory\' argument is missing');
      }
      file = resolve(directory, file);
    }
    file = searchResourceFile(file, {stage, searchInParentDirectories});
    if (!file) {
      return undefined;
    }
    const definition = load(file);
    return {definition, file};
  }

  static async _$fetchFromLocalResources(specifier) {
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

    const {definition, file} = await this._$fetchFromLocation(directory);

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
    if (!this._$registryClient) {
      this._$registryClient = await this.$create({
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
    return this._$registryClient;
  }

  static async $getRegistryServer() {
    if (!this._$registryServer) {
      this._$registryServer = await this.$import(RESDIR_REGISTRY_SERVER);
    }
    return this._$registryServer;
  }

  static async $getResourceFetcher() {
    if (!this._$resourceFetcher) {
      this._$resourceFetcher = new ResourceFetcher({
        registryServer: await this.$getRegistryServer(),
        clientDirectory: this.$getClientDirectory()
      });
    }
    return this._$resourceFetcher;
  }

  static async _$fetchFromRegistry(specifier) {
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
    return await this.$load(specifier, {directory, isImporting: true, disableCache});
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

  async _$inherit(base) {
    this._$bases.push(base);
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
      if ((isSelf || deepSearch) && resource._$bases) {
        resources.push(...resource._$bases);
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

  _$getInheritedValue(key, options) {
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
    return this._$isNative;
  }

  $setIsNative(isNative) {
    this._$isNative = isNative;
  }

  $getParent() {
    return this._$parent;
  }

  $setParent(parent) {
    this._$parent = parent;
  }

  $getCreator() {
    return this._$getInheritedValue('_$creator');
  }

  $setCreator(creator) {
    this._$creator = creator;
  }

  $getKey() {
    return this._$key;
  }

  $setKey(key) {
    if (!this.$getIsNative()) {
      validateResourceKey(key);
    }
    this._$key = key;
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
    return this._$resourceFile;
  }

  $setResourceFile(file) {
    this._$resourceFile = file;
  }

  $getImplementationFile({considerBases} = {}) {
    return considerBases ?
      this._$getInheritedValue('_$implementationFile') :
      this._$implementationFile;
  }

  $setImplementationFile(file) {
    this._$implementationFile = file;
  }

  $getResourceSpecifier() {
    return this._$resourceSpecifier;
  }

  $setResourceSpecifier(specifier) {
    this._$resourceSpecifier = specifier;
  }

  $getCurrentDirectory({throwIfUndefined = true} = {}) {
    let currentDirectory = this._$currentDirectory;

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
    this._$currentDirectory = directory;
  }

  $getIsUnpublishable() {
    return this._$isUnpublishable;
  }

  $setIsUnpublishable(isUnpublishable) {
    this._$isUnpublishable = isUnpublishable;
  }

  $getExporterDefinition() {
    return this._$getInheritedValue('_$exporterDefinition');
  }

  $setExporterDefinition(exporterDefinition) {
    this._$exporterDefinition = exporterDefinition;
  }

  $getIsMethodInput() {
    return this._$getInheritedValue('_$isMethodInput');
  }

  $setIsMethodInput(isMethodInput) {
    if (isMethodInput !== undefined && typeof isMethodInput !== 'boolean') {
      throw createClientError('\'isMethodInput\' argument must be a boolean');
    }
    this._$isMethodInput = isMethodInput;
  }

  $getIsMethodOutput() {
    return this._$getInheritedValue('_$isMethodOutput');
  }

  $setIsMethodOutput(isMethodOutput) {
    if (isMethodOutput !== undefined && typeof isMethodOutput !== 'boolean') {
      throw createClientError('\'isMethodOutput\' argument must be a boolean');
    }
    this._$isMethodOutput = isMethodOutput;
  }

  get $comment() {
    return this._$comment;
  }

  set $comment(comment) {
    if (comment !== undefined && typeof comment !== 'string') {
      throw createClientError(`${formatCode('@comment')} attribute must be a string`);
    }
    this._$comment = comment;
  }

  get $type() {
    return this._$type;
  }

  set $type(type) {
    if (type !== undefined) {
      type = this.constructor.$normalizeType(type);
    }
    this._$type = type;
  }

  static $normalizeType(type) {
    if (typeof type !== 'string') {
      throw createClientError(`${formatCode('@type')} attribute must be a string`);
    }
    return type;
  }

  get $loadAttribute() {
    return this._$loadAttribute;
  }

  set $loadAttribute(loadAttribute) {
    if (loadAttribute !== undefined) {
      loadAttribute = this.constructor.$normalizeLoadAttribute(loadAttribute);
    }
    this._$loadAttribute = loadAttribute;
  }

  static $normalizeLoadAttribute(loadAttribute) {
    if (typeof loadAttribute !== 'string' && !isPlainObject(loadAttribute)) {
      throw createClientError(`Invalid ${formatCode('@load')} attribute value`);
    }
    return loadAttribute;
  }

  get $importAttribute() {
    return this._$importAttribute;
  }

  set $importAttribute(importAttribute) {
    if (importAttribute !== undefined) {
      importAttribute = Resource.$normalizeImportAttribute(importAttribute);
    }
    this._$importAttribute = importAttribute;
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
    return this._$directory;
  }

  set $directory(directory) {
    if (directory !== undefined && typeof directory !== 'string') {
      throw createClientError(`${formatCode('@directory')} attribute must be a string`);
    }
    this._$directory = directory;
  }

  get $name() {
    return this._$getInheritedValue('_$name');
  }

  set $name(name) {
    if (name !== undefined) {
      validateResourceName(name);
    }
    this._$name = name;
  }

  get $description() {
    return this._$getInheritedValue('_$description');
  }

  set $description(description) {
    if (description !== undefined) {
      validateResourceDescription(description);
    }
    this._$description = description;
  }

  get $aliases() {
    return this._$getInheritedValue('_$aliases');
  }

  set $aliases(aliases) {
    this._$aliases = undefined;
    if (aliases !== undefined) {
      if (typeof aliases === 'string') {
        aliases = [aliases];
      }
      if (!Array.isArray(aliases)) {
        throw createClientError(
          `${formatCode('@aliases')} attribute must be a string or an array of string`
        );
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
    if (!this._$aliases) {
      this._$aliases = [];
    }
    if (!this._$aliases.includes(alias)) {
      this._$aliases.push(alias);
    }
  }

  $hasAlias(alias) {
    const aliases = this.$aliases;
    return Boolean(aliases && aliases.includes(alias));
  }

  get $position() {
    return this._$getInheritedValue('_$position');
  }

  set $position(position) {
    if (position !== undefined && typeof position !== 'number') {
      throw createClientError(`${formatCode('@position')} attribute must be a number`);
    }
    this._$position = position;
  }

  get $isOptional() {
    return this._$getInheritedValue('_$isOptional');
  }

  set $isOptional(isOptional) {
    if (isOptional !== undefined && typeof isOptional !== 'boolean') {
      throw createClientError(`${formatCode('@isOptional')} attribute must be a boolean`);
    }
    this._$isOptional = isOptional;
  }

  get $isVariadic() {
    return this._$getInheritedValue('_$isVariadic');
  }

  set $isVariadic(isVariadic) {
    if (isVariadic !== undefined && typeof isVariadic !== 'boolean') {
      throw createClientError(`${formatCode('@isVariadic')} attribute must be a boolean`);
    }
    this._$isVariadic = isVariadic;
  }

  get $isSubInput() {
    return this._$getInheritedValue('_$isSubInput');
  }

  set $isSubInput(isSubInput) {
    if (isSubInput !== undefined && typeof isSubInput !== 'boolean') {
      throw createClientError(`${formatCode('@isSubInput')} attribute must be a boolean`);
    }
    this._$isSubInput = isSubInput;
  }

  get $examples() {
    return this._$getInheritedValue('_$examples');
  }

  set $examples(examples) {
    if (examples !== undefined && !Array.isArray(examples)) {
      examples = [examples];
    }
    this._$examples = examples;
  }

  $getGetter() {
    return this._$getInheritedValue('_$getter');
  }

  async $setGetter(getter, {key, directory, isNative, disableCache}) {
    if (getter === undefined) {
      this._$getter = undefined;
      return;
    }
    this._$getter = await this.constructor.$create(getter, {
      key,
      directory,
      isNative,
      disableCache
    });
  }

  async $resolveGetter({parent} = {}) {
    const getter = this.$getGetter();
    if (!getter) {
      return this;
    }
    return await getter.$call(parent);
  }

  get $runtime() {
    return this._$getInheritedValue('_$runtime');
  }

  set $runtime(runtime) {
    if (runtime !== undefined && typeof runtime !== 'string') {
      throw createClientError(`${formatCode('@runtime')} attribute must be a string`);
    }
    this._$runtime = runtime !== undefined ? new Runtime(runtime) : undefined;
  }

  get $implementation() {
    return this._$implementationAttribute;
  }

  set $implementation(implementation) {
    if (implementation !== undefined && typeof implementation !== 'string') {
      throw createClientError(`${formatCode('@implementation')} attribute must be a string`);
    }
    this._$implementationAttribute = implementation;
  }

  get $isOpen() {
    const isOpen = this._$getInheritedValue('_$isOpen');
    return isOpen !== undefined ? isOpen : this.$getIsOpenByDefault();
  }

  set $isOpen(isOpen) {
    if (isOpen !== undefined && typeof isOpen !== 'boolean') {
      throw createClientError(`${formatCode('@isOpen')} attribute must be a boolean`);
    }
    this._$isOpen = isOpen;
  }

  $getIsOpenByDefault() {
    return !(this.$getIsMethodInput() || this.$getIsMethodOutput());
  }

  get $isHidden() {
    return this._$getInheritedValue('_$isHidden');
  }

  set $isHidden(isHidden) {
    if (isHidden !== undefined && typeof isHidden !== 'boolean') {
      throw createClientError(`${formatCode('@isHidden')} attribute must be a boolean`);
    }
    this._$isHidden = isHidden;
  }

  $defaultAutoBoxing = false;

  get $autoBoxing() {
    let autoBoxing = this._$getInheritedValue('_$autoBoxing');
    if (autoBoxing === undefined) {
      autoBoxing = this.$defaultAutoBoxing;
    }
    return autoBoxing;
  }

  set $autoBoxing(autoBoxing) {
    if (autoBoxing !== undefined && typeof autoBoxing !== 'boolean') {
      throw createClientError(`${formatCode('@autoBoxing')} attribute must be a boolean`);
    }
    this._$autoBoxing = autoBoxing;
  }

  $defaultAutoUnboxing = false;

  get $autoUnboxing() {
    let autoUnboxing = this._$getInheritedValue('_$autoUnboxing');
    if (autoUnboxing === undefined) {
      autoUnboxing = this.$defaultAutoUnboxing;
    }
    return autoUnboxing;
  }

  set $autoUnboxing(autoUnboxing) {
    if (autoUnboxing !== undefined && typeof autoUnboxing !== 'boolean') {
      throw createClientError(`${formatCode('@autoUnboxing')} attribute must be a boolean`);
    }
    this._$autoUnboxing = autoUnboxing;
  }

  $getExport({considerBases} = {}) {
    return considerBases ? this._$getInheritedValue('_$export') : this._$export;
  }

  $setExport(resource) {
    this._$export = resource;
  }

  $getType() {
    return this.constructor.$RESOURCE_TYPE;
  }

  static $isTypeIdentifier(identifier) {
    return Boolean(getResourceClass(identifier, {throwIfInvalid: false}));
  }

  $forEachChild(fn, {includeResourceChildren = true, includeNativeChildren} = {}) {
    if (includeResourceChildren) {
      const children = this._$children;
      if (children) {
        const result = _$forEachItems(children, fn);
        if (result === false) {
          return false;
        }
      }
    }

    if (includeNativeChildren) {
      const children = this.constructor._$getNativeChildren();
      const result = _$forEachItems(children, fn);
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
      this._$children.splice(removedChildIndex, 0, child);
    } else {
      this._$children.push(child);
    }

    Object.defineProperty(this, key, {
      get() {
        return child.$autoUnbox();
      },
      set(value) {
        const promise = child.$autoBox(value);
        if (promise) {
          throw createClientError(
            `Can't change ${formatCode(
              key
            )} synchronously with an attribute setter. Please use the $setChild() asynchronous method.`
          );
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
        this._$children.splice(index, 1);
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

  static async $invoke(parent, expression) {
    return await catchContext(parent, async () => {
      expression = {...expression};

      const argument = shiftPositionalArguments(expression);

      if (argument === undefined) {
        return parent;
      }

      if (isParsedExpression(argument)) {
        const subexpression = argument;
        if (parent === undefined) {
          throw createClientError(`Cannot run a subexpression with an undefined parent`);
        }
        const output = await Resource.$invoke(parent, subexpression);
        return await Resource.$invoke(output, expression);
      }

      if (isResourceSpecifier(argument)) {
        const specifier = argument;
        const stage = takeStage(expression);
        const isImporting = takeArgument(expression, '@import');
        const resource = await Resource.$load(specifier, {
          directory: parent.$getCurrentDirectory({throwIfUndefined: false}), // ???
          stage,
          isImporting
        });
        return await Resource.$invoke(resource, expression);
      }

      const key = argument;

      if (parent === undefined) {
        throw createClientError(`Cannot get ${formatCode(key)} on an undefined parent`);
      }

      if (parent._$isRemote) {
        // TODO: Make a *real* implementation
        expression = matchExpression(expression).remainder; // Get rid of the PARSED_EXPRESSION_TAG
        if (!isEmpty(expression)) {
          throw createClientError('Sorry, remote method arguments are not yet implemented.');
        }
        let result = await parent[key]();
        if (result !== undefined) {
          result = await Resource.$create(result);
        }
        return result;
      }

      let child = parent.$findChild(key, {includeNativeChildren: true});

      if (!child) {
        throw createClientError(
          `No attribute, subresource, or method found with this key: ${formatCode(key)}`
        );
      }

      child = await child.$resolveGetter({parent});

      if (child.$call) {
        return await child.$call(parent, expression);
      }

      return await Resource.$invoke(child, expression);
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

  _$getAllListeners() {
    if (!Object.prototype.hasOwnProperty.call(this, '_$listeners')) {
      this._$listeners = {};
      this.$forEachChild(child => {
        if (typeof child.$getAllListenedEvents === 'function') {
          for (const event of child.$getAllListenedEvents()) {
            if (!this._$listeners[event]) {
              this._$listeners[event] = [];
            }
            this._$listeners[event].push(child);
          }
        }
      });
    }
    return this._$listeners;
  }

  _$getAllListenersForEvent(event) {
    return this._$getAllListeners()[event] || [];
  }

  async $emit(event, eventInput = {}) {
    if (typeof event !== 'string') {
      throw new TypeError('\'event\' argument must be a string');
    }

    if (!isPlainObject(eventInput)) {
      throw new TypeError('\'eventInput\' argument must be a plain object');
    }

    for (const listener of this._$getAllListenersForEvent(event)) {
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
    const helper = await this.constructor._$getResourceHelper();
    await helper.create({typeOrSpecifier}, environment);
  }

  async '@add'({typeOrSpecifier, key}, environment) {
    const helper = await this.constructor._$getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.add({resourcePtr, typeOrSpecifier, key}, environment);
  }

  async '@remove'({key}, environment) {
    const helper = await this.constructor._$getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.remove({resourcePtr, key}, environment);
  }

  async '@normalize'({format}, environment) {
    const helper = await this.constructor._$getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.normalize({resourcePtr, format}, environment);
  }

  async '@version'(_input, _environment) {
    // Implemented in run-cli
  }

  async '@help'({keys, showBuiltIn} = {}, environment) {
    const helper = await this.constructor._$getResourceHelper();
    const resourcePtr = await this.constructor.$create({'@type': 'pointer', '@target': this});
    await helper.help({resourcePtr, keys, showBuiltIn}, environment);
  }

  async '@@help'({keys} = {}, environment) {
    return await this['@help']({keys, showBuiltIn: true}, environment);
  }

  static async _$getResourceHelper() {
    if (!this._$resourceHelper) {
      this._$resourceHelper = await Resource.$import(RESOURCE_HELPER);
    }
    return this._$resourceHelper;
  }

  static $normalize(definition, _options) {
    if (definition !== undefined && !isPlainObject(definition)) {
      throw createClientError('Invalid resource definition');
    }
    return definition;
  }

  $serialize(options) {
    let definition = {};

    if (this._$comment !== undefined) {
      definition['@comment'] = this._$comment;
    }

    if (this._$type !== undefined) {
      definition['@type'] = this._$type;
    }

    if (this._$loadAttribute !== undefined) {
      definition['@load'] = this._$loadAttribute;
    }

    this._$serializeImportAttribute(definition, options);

    if (this._$directory !== undefined) {
      definition['@directory'] = this._$directory;
    }

    if (this._$name !== undefined) {
      definition['@name'] = this._$name;
    }

    if (this._$description !== undefined) {
      definition['@description'] = this._$description;
    }

    this._$serializeAliases(definition, options);

    if (this._$position !== undefined) {
      definition['@position'] = this._$position;
    }

    if (this._$isOptional !== undefined) {
      definition['@isOptional'] = this._$isOptional;
    }

    if (this._$isVariadic !== undefined) {
      definition['@isVariadic'] = this._$isVariadic;
    }

    if (this._$isSubInput !== undefined) {
      definition['@isSubInput'] = this._$isSubInput;
    }

    this._$serializeExamples(definition, options);

    this._$serializeGetter(definition, options);

    if (this._$runtime !== undefined) {
      definition['@runtime'] = this._$runtime.toJSON();
    }

    if (this._$implementationAttribute !== undefined) {
      definition['@implementation'] = this._$implementationAttribute;
    }

    if (this._$isOpen !== undefined) {
      definition['@isOpen'] = this._$isOpen;
    }

    if (this._$isHidden !== undefined) {
      definition['@isHidden'] = this._$isHidden;
    }

    if (this._$autoBoxing !== undefined) {
      definition['@autoBoxing'] = this._$autoBoxing;
    }

    if (this._$autoUnboxing !== undefined) {
      definition['@autoUnboxing'] = this._$autoUnboxing;
    }

    this._$serializeChildren(definition, options);

    this._$serializeExport(definition, options);

    if (options && options.isChild && isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }

  _$serializeImportAttribute(definition, _options) {
    const importAttribute = this._$importAttribute;
    if (importAttribute !== undefined) {
      if (importAttribute.length === 1) {
        definition['@import'] = importAttribute[0];
      } else if (importAttribute.length > 1) {
        definition['@import'] = importAttribute;
      }
    }
  }

  _$serializeAliases(definition, _options) {
    const aliases = this._$aliases;
    if (aliases && aliases.length > 0) {
      definition['@aliases'] = aliases;
    }
  }

  _$serializeExamples(definition, _options) {
    const examples = this._$examples;
    if (examples && examples.length > 0) {
      definition['@examples'] = examples;
    }
  }

  _$serializeGetter(definition, _options) {
    const getter = this._$getter;
    if (getter) {
      definition['@getter'] = getter.$serialize();
    }
  }

  _$serializeChildren(definition, options) {
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

  _$serializeExport(definition, options) {
    const exportResource = this._$export;
    if (exportResource) {
      const exportDefinition = exportResource.$serialize(options);
      if (exportDefinition) {
        definition['@export'] = exportDefinition;
      }
    }
  }
}

function _$forEachItems(items, fn) {
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

function searchResourceFile(directoryOrFile, {stage, searchInParentDirectories = false} = {}) {
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

  let filenames = [RESOURCE_FILE_NAME + PRIVATE_RESOURCE_SUFFIX, RESOURCE_FILE_NAME];
  if (stage) {
    filenames = [
      RESOURCE_FILE_NAME + '.' + stage + PRIVATE_RESOURCE_SUFFIX,
      RESOURCE_FILE_NAME + '.' + stage,
      ...filenames
    ];
  }

  for (const format of RESOURCE_FILE_FORMATS) {
    for (const filename of filenames) {
      const file = join(directory, filename + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }
  }

  if (searchInParentDirectories) {
    const parentDirectory = join(directory, '..');
    if (parentDirectory !== directory) {
      return searchResourceFile(parentDirectory, {stage, searchInParentDirectories});
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
      throw createClientError(
        `A resource implementation file must export a function (file: ${formatPath(file)})`
      );
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

function takeStage(expression) {
  let stage = takeArgument(expression, '@stage');
  for (const shortcut of ['@dev', '@test', '@prod', '@alpha', '@beta']) {
    if (takeArgument(expression, shortcut)) {
      stage = shortcut.slice(1);
    }
  }
  return stage;
}

export default Resource;
