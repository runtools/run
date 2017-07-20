import {join, extname} from 'path';
import {readFileSync, writeFileSync, statSync} from 'fs';
import {outputFile} from 'fs-extra';
import {tmpdir} from 'os';
import crypto from 'crypto';
import {pick, entries, cloneDeepWith} from 'lodash';
import fetch from 'node-fetch';
import strictUriEncode from 'strict-uri-encode';
import JSON5 from 'json5';
import YAML from 'js-yaml';
import {formatPath, formatCode} from '@resdir/console';

export function loadFile(file, {throwIfNotFound = true, parse = false} = {}) {
  if (typeof file !== 'string') {
    throw new TypeError('\'file\' must be a string');
  }

  let data;

  try {
    data = readFileSync(file, 'utf8');
  } catch (_) {
    if (throwIfNotFound) {
      throw new Error(`File not found: ${formatPath(file)}`);
    }
    return undefined;
  }

  if (parse) {
    let parser;
    const ext = extname(file);
    if (ext === '.json5') {
      parser = data => JSON5.parse(data);
    } else if (ext === '.json') {
      parser = data => JSON.parse(data);
    } else if (ext === '.yaml' || ext === '.yml') {
      parser = data => YAML.safeLoad(data);
    } else {
      throw new Error(`Unsupported file format: ${formatPath(file)}`);
    }

    try {
      data = parser(data);
    } catch (err) {
      throw new Error(`Invalid file: ${formatPath(file)} (${err.message})`);
    }
  }

  return data;
}

export function saveFile(file, data, {stringify = false} = {}) {
  if (typeof file !== 'string') {
    throw new TypeError('\'file\' must be a string');
  }

  if (stringify) {
    const ext = extname(file);
    if (ext === '.json5') {
      data = JSON5.stringify(data, undefined, 2);
    } else if (ext === '.json') {
      data = JSON.stringify(data, undefined, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      data = YAML.safeDump(data);
    } else {
      throw new Error(`Unsupported file format: ${formatPath(file)}`);
    }
  }

  writeFileSync(file, data);
}

export function getPropertyKeyAndValue(source, name, aliases = []) {
  if (source === undefined) {
    return;
  }
  let result;
  const keys = [name, ...aliases];
  let foundKey;
  for (const key of keys) {
    if (key && key in source) {
      if (foundKey) {
        throw new Error(`Can't have both ${formatCode(foundKey)} and ${formatCode(key)}`);
      }
      result = {key, value: source[key]};
      foundKey = key;
    }
  }
  return result;
}

export function getProperty(source, name, aliases) {
  const result = getPropertyKeyAndValue(source, name, aliases);
  return result && result.value;
}

export function setProperty(target, source, name, aliases) {
  const result = getPropertyKeyAndValue(source, name, aliases);
  if (result) {
    target[name] = result.value;
  }
}

export function generateHash(data, algorithm = 'sha256') {
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

export async function fetchJSON(url, options = {}) {
  if (typeof url !== 'string') {
    throw new TypeError('\'url\' must be a string');
  }

  let cacheFile;

  if (options.cacheTime) {
    const cacheDir = join(tmpdir(), 'run-common', 'cache');
    cacheFile = join(cacheDir, strictUriEncode(url));

    let stats;
    try {
      stats = statSync(cacheFile);
    } catch (err) {
      /* File is missing */
    }
    if (stats && Date.now() - stats.mtime.getTime() < options.cacheTime) {
      const result = JSON.parse(readFileSync(cacheFile, 'utf8'));
      return result;
    }
  }

  const opts = {
    headers: {Accept: 'application/json'}
  };
  Object.assign(opts, pick(options, ['method', 'headers', 'timeout']));

  const response = await fetch(url, opts);
  if (response.status !== 200) {
    const error = new Error(`Unexpected ${response.status} HTTP status`);
    error.httpStatus = response.status;
    throw error;
  }

  const result = await response.json();

  if (cacheFile) {
    await outputFile(cacheFile, JSON.stringify(result));
  }

  return result;
}

export async function catchError(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
}

export function avoidCommonMistakes(obj, mistakes) {
  for (const [wrong, correct] of entries(mistakes)) {
    if (wrong in obj) {
      throw new Error(
        `Wrong property name: ${formatCode(wrong)}. Did you mean ${formatCode(correct)}?`
      );
    }
  }
}

export function callSuper(method, context, ...args) {
  const methodName = method.name;
  let proto = context;
  while (true) {
    const superProto = Object.getPrototypeOf(proto);
    if (superProto === null) {
      throw new Error(`Super method '${methodName}' not found`);
    }
    if (Object.prototype.hasOwnProperty.call(proto, methodName) && proto[methodName] === method) {
      const superMethod = superProto[methodName];
      return superMethod.apply(context, args);
    }
    proto = superProto;
  }
}

export function compactObject(obj) {
  const result = {};
  for (const [key, value] of entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function cloneDeepWithMethod(obj, method) {
  return cloneDeepWith(obj, value => {
    if (typeof value === 'object' && value !== null && method in value) {
      value = value.toJSON();
      value = cloneDeepWithMethod(value, method);
      return value;
    }
  });
}

export function toJSONDeep(obj) {
  return cloneDeepWithMethod(obj, 'toJSON');
}

export function parseCommandLineArguments(argsAndOpts) {
  if (!Array.isArray(argsAndOpts)) {
    throw new TypeError('\'argsAndOpts\' must be an array');
  }

  const result = {arguments: [], options: {}};

  for (let i = 0; i < argsAndOpts.length; i++) {
    const argOrOpt = argsAndOpts[i];

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('--')) {
      let opt = argOrOpt.slice(2);
      let val;

      const index = opt.indexOf('=');
      if (index !== -1) {
        val = opt.slice(index + 1);
        opt = opt.slice(0, index);
      }

      if (val === undefined) {
        if (opt.startsWith('no-')) {
          val = 'false';
          opt = opt.slice(3);
        } else if (opt.startsWith('non-')) {
          val = 'false';
          opt = opt.slice(4);
        }
      }

      if (val === undefined && i + 1 < argsAndOpts.length) {
        const nextArgOrOpt = argsAndOpts[i + 1];
        if (typeof nextArgOrOpt !== 'string' || !nextArgOrOpt.startsWith('-')) {
          val = nextArgOrOpt;
          i++;
        }
      }

      if (val === undefined) {
        val = 'true';
      }

      result.options[opt] = val;
      continue;
    }

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('-')) {
      const opts = argOrOpt.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (!/[\w\d]/.test(opt)) {
          throw new Error(`Invalid command line option: ${formatCode(argOrOpt)}`);
        }
        result.options[opt] = 'true';
      }
      continue;
    }

    const argument = argOrOpt;
    result.arguments.push(argument);
  }

  return result;
}
