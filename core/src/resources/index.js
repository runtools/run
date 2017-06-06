import {join, resolve, dirname, basename, isAbsolute} from 'path';
import {existsSync} from 'fs';
import {isPlainObject} from 'lodash';
import isDirectory from 'is-directory';
import {loadFile, getProperty, formatString, formatPath} from 'run-common';

import BaseResource from './base';

const RESOURCE_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const RESOURCE_FILE_NAME = 'resource';

export async function createResource(definition = {}, {name, directory, file, parse, owner} = {}) {
  const type = typeof definition;
  if (type === 'boolean' || type === 'number' || type === 'string' || Array.isArray(definition)) {
    definition = {$value: definition};
  } else if (!isPlainObject(definition)) {
    throw new Error("'definition' argument is invalid");
  }

  let types = getProperty(definition, '$types', ['$type']);
  types = BaseResource.$normalizeTypes(types);
  if (types.length === 0 && definition.$value !== undefined) {
    types = [inferType(definition.$value)];
  }

  if (name) {
    definition = {...definition, $name: name};
  }

  const ResourceClass = getResourceClass(types);

  const dir = directory || (file && dirname(file));
  const ImplementationClass = ResourceClass.$getImplementationClass(definition, {directory: dir});

  const resource = new ImplementationClass(definition, {directory, file, parse, owner});
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

function getResourceClass(types) {
  if (types.length === 0) {
    return require('./object').default;
  }

  if (types.length === 1) {
    const type = types[0];
    if (typeof type === 'string') {
      switch (type) {
        case 'resource':
          return BaseResource;
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
        case 'method':
          return require('./method').default;
        case 'composite':
          return require('./composite').default;
        case 'command':
          return require('./command').default;
        case 'macro':
          return require('./macro').default;
        case 'tool':
          return require('./tool').default;
        default:
          return require('./composite').default;
      }
    }
  }

  return require('./composite').default;
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
