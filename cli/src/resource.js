import {existsSync} from 'fs';
import {join, resolve, dirname, basename} from 'path';
import isDirectory from 'is-directory';
import {
  readFile,
  writeFile,
  throwUserError,
  avoidCommonMistakes,
  formatPath,
  formatCode
} from 'run-common';

import Entity from './entity';
import Property from './property';
import Version from './version';

const RESOURCE_FILE_NAME = 'resource';
const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_RESOURCE_FILE_FORMAT = 'json5';

const BUIT_IN_RESOURCES = [
  // TODO: move those resources to resdir
  {
    name: 'res/tool'
  },
  {
    name: 'js/tool',
    is: ['res/tool'],
    engine: 'node@>=6.10.0'
  }
];

export class Resource extends Entity {
  static async create(file, definition, {context} = {}) {
    if (!file) {
      throw new Error("'file' argument is missing");
    }

    context = this.extendContext(context, {resourceFile: file});

    avoidCommonMistakes(definition, {author: 'authors'}, {context});

    const resource = await Entity.create.call(this, definition, {context});

    const dir = dirname(file);

    Object.assign(resource, {
      version: definition.version && Version.create(definition.version, context),
      description: definition.description,
      authors: definition.authors,
      license: definition.license,
      repository: definition.repository && this.normalizeRepository(definition.repository),
      properties: Property.createMany(definition.properties || [], context),
      extendedResources: await this.extendMany(dir, definition.is || [], context),
      includedResources: await this.includeMany(dir, definition.has || [], context),
      resourceFile: file
    });

    if (resource.name === 'res/tool' || resource.findExtendedResource('res/tool')) {
      const {Tool} = require('./tool'); // Use late 'require' to avoid a circular referencing issue
      return await Tool.create(file, definition, {resource, context});
    }

    return resource;
  }

  static extendContext(base, resource) {
    return {...base, resource: resource.resourceFile};
  }

  static async load(source, {searchInPath, context} = {}) {
    const result = await this._load(source, {searchInPath, context});
    if (!result) {
      return undefined;
    }

    const {file, definition} = result;
    return await this.create(file, definition, {context});
  }

  static async _load(source, {searchInPath}) {
    // TODO: load resources from resdir

    const definition = BUIT_IN_RESOURCES.find(resource => resource.name === source);
    if (definition) {
      return {file: '__BUILT_IN_RESOURCE__', definition};
    }

    const file = this.searchResourceFile(source, {searchInPath});
    if (file) {
      const definition = readFile(file, {parse: true});
      return {file, definition};
    }

    return undefined;
  }

  static async ensure(dir, {resourceFileFormat = DEFAULT_RESOURCE_FILE_FORMAT, context} = {}) {
    let file = this.searchResourceFile(dir);
    let definition;
    if (file) {
      definition = readFile(file, {parse: true});
    } else {
      file = join(dir, RESOURCE_FILE_NAME + '.' + resourceFileFormat);
      definition = {name: basename(dir), version: '0.1.0-pre-alpha'};
      writeFile(file, definition, {stringify: true});
    }
    return await this.create(file, definition, {context});
  }

  static async loadUserResource(dir, {context} = {}) {
    const resource = await this.load(dir, {searchInPath: true, context});
    if (!resource) {
      return undefined;
    }

    dir = dirname(resource.resourceFile);
    const parentDir = join(dir, '..');
    if (parentDir !== dir) {
      const parentEntity = await this.loadUserResource(parentDir, {context});
      if (parentEntity) {
        resource.parentEntity = parentEntity;
      }
    }

    return resource;
  }

  static searchResourceFile(dirOrFile, {searchInPath = false} = {}) {
    let dir;

    if (isDirectory.sync(dirOrFile)) {
      dir = dirOrFile;
    } else if (existsSync(dirOrFile)) {
      const file = dirOrFile;
      const filename = basename(file);
      if (RESOURCE_FILE_FORMATS.find(format => filename === RESOURCE_FILE_NAME + '.' + format)) {
        return file;
      }
    }

    if (!dir) {
      return undefined;
    }

    for (const format of RESOURCE_FILE_FORMATS) {
      const file = join(dir, RESOURCE_FILE_NAME + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }

    if (searchInPath) {
      const parentDir = join(dir, '..');
      if (parentDir !== dir) {
        return this.searchResourceFile(parentDir, {searchInPath});
      }
    }

    return undefined;
  }

  static async extend(dir, source, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (typeof source !== 'string') {
      throwUserError(`Base resource ${formatCode('source')} must be a string`, {context});
    }

    source = source.trim();

    if (!source) {
      throwUserError(`Base resource ${formatCode('source')} cannot be empty`, {context});
    }

    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const resource = await this.load(source, context);
    if (!resource) {
      throwUserError(`Base resource not found: ${formatPath(source)}`, {
        context
      });
    }
    return resource;
  }

  static extendMany(dir, sources, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (!sources) {
      throw new Error("'sources' argument is missing");
    }

    if (typeof sources === 'string') {
      sources = sources.split(',');
    }

    if (!Array.isArray(sources)) {
      throwUserError(`${formatCode('extend')} property must be a string or an array`, {context});
    }

    return Promise.all(
      sources.map(source => {
        return this.extend(dir, source, context);
      })
    );
  }

  static async include(dir, source, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (typeof source !== 'string') {
      throwUserError(`Resource ${formatCode('source')} must be a string`, {context});
    }

    source = source.trim();

    if (!source) {
      throwUserError(`Resource ${formatCode('source')} cannot be empty`, {context});
    }

    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const resource = await this.load(source, {context});
    if (!resource) {
      throwUserError(`Resource not found: ${formatPath(source)}`, {
        context
      });
    }
    return resource;
  }

  static includeMany(dir, sources, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (!sources) {
      throw new Error("'sources' argument is missing");
    }

    if (typeof sources === 'string') {
      sources = sources.split(',');
    }

    if (!Array.isArray(sources)) {
      throwUserError(`${formatCode('has')} property must be a string or an array`, {context});
    }

    return Promise.all(
      sources.map(source => {
        return this.include(dir, source, context);
      })
    );
  }

  find(fn) {
    // Breadth-first with extended resources
    const resources = [this];
    while (resources.length) {
      const resource = resources.shift();
      const result = fn(resource);
      if (result !== undefined) {
        return result;
      }
      resources.push(...resource.extendedResources);
    }

    // Depth-first with parent entities
    if (this.parentEntity) {
      return this.parentEntity.find(fn);
    }

    return undefined;
  }

  reduce(fn, initialValue) {
    // Breadth-first with extended resources
    let accumulator = initialValue;
    const resources = [this];
    while (resources.length) {
      const resource = resources.shift();
      accumulator = fn(accumulator, resource);
      resources.push(...resource.extendedResources);
    }

    // Depth-first with parent entities
    if (this.parentEntity) {
      return this.parentEntity.reduce(fn, accumulator);
    }

    return accumulator;
  }

  findExtendedResource(name) {
    return this.find(resource => {
      for (const extendedResource of resource.extendedResources) {
        if (extendedResource.isMatching(name)) {
          return extendedResource;
        }
      }
      return undefined;
    });
  }

  findIncludedResource(name) {
    return this.find(resource => {
      for (const includedResource of resource.includedResources) {
        if (includedResource.isMatching(name)) {
          return includedResource;
        }
      }
      return undefined;
    });
  }

  getNameUniverse() {
    const [universe, identifier] = this.name.split('/');
    if (!identifier) {
      return undefined;
    }
    return universe;
  }

  getNameIdentifier() {
    const [universe, identifier] = this.name.split('/');
    if (!identifier) {
      return universe;
    }
    return identifier;
  }

  static validateName(name) {
    let [universe, identifier, rest] = name.split('/');

    if (universe && !identifier) {
      identifier = universe;
      universe = undefined;
    }

    if (!this.validateNamePart(identifier)) {
      return false;
    }

    if (universe && !this.validateNamePart(universe)) {
      return false;
    }

    if (rest) {
      return false;
    }

    return true;
  }

  static normalizeRepository(repository) {
    // TODO: more normalizations...
    // We should not assume that the repository type is always Git
    return repository.url || repository;
  }
}

export default Resource;
