import {join, resolve, dirname, basename, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {isPlainObject} from 'lodash';
import isDirectory from 'is-directory';
import {loadFile, getProperty, formatString, formatPath} from 'run-common';

import Resource from './resource';
import {getPrimitiveResourceClass} from './primitives';

const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const RESOURCE_FILE_NAME = 'resource';

export async function createResource(
  definition = {},
  {parents = [], owner, name, directory, file, parse} = {}
) {
  const type = typeof definition;
  if (type === 'boolean' || type === 'number' || type === 'string' || Array.isArray(definition)) {
    definition = {$value: definition};
  } else if (!isPlainObject(definition)) {
    throw new Error("'definition' argument is invalid");
  }

  let types = getProperty(definition, '$types', ['$type']);
  types = Resource.$normalizeTypes(types);
  if (types.length === 0 && definition.$value !== undefined) {
    types = [inferType(definition.$value)];
  }

  const dir = directory || (file && dirname(file));

  const parentsClass = [];
  const actualParents = [...parents];

  for (const type of types) {
    if (typeof type === 'string') {
      if (type === 'resource') continue;
      const Class = getPrimitiveResourceClass(type);
      if (Class) {
        parentsClass.push(Class);
      } else {
        const parent = await loadResource(type, {directory: dir});
        actualParents.push(parent);
      }
    } else if (isPlainObject(type)) {
      const parent = await createResource(type, {directory: dir});
      actualParents.push(parent);
    } else {
      throw new Error("A 'type' must be a string or a plain object");
    }
  }

  for (const parent of actualParents) {
    parentsClass.push(parent.constructor);
  }

  let ResourceClass = Resource;
  for (const Class of parentsClass) {
    if (Object.prototype.isPrototypeOf.call(ResourceClass, Class)) {
      ResourceClass = Class;
    } else if (
      ResourceClass === Class ||
      Object.prototype.isPrototypeOf.call(Class, ResourceClass)
    ) {
      // NOOP
    } else {
      throw new Error(`Can't mix a ${Class.name} with a ${ResourceClass.name}`);
    }
  }

  if (name) {
    definition = {...definition, $name: name};
  }

  const implementation = getProperty(definition, '$implementation');
  if (implementation) {
    const classBuilder = requireImplementation(implementation, {directory: dir});
    ResourceClass = classBuilder(ResourceClass);
  }

  const resource = new ResourceClass(definition, {
    parents: actualParents,
    owner,
    directory,
    file,
    parse,
    resourceCreator: createResource
  });
  await resource.$completeInitialization();
  return resource;
}

export async function loadResource(
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

  const definition = await loadFile(file, {parse: true});

  return await createResource(definition, {file});
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
