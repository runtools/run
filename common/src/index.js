import {join, extname} from 'path';
import {existsSync, mkdirSync, readFileSync, statSync} from 'fs';
import {readFile, writeFile, outputFile} from 'fs-extra';
import {homedir, tmpdir} from 'os';
import crypto from 'crypto';
import semver from 'semver';
import {pick, entries, cloneDeepWith} from 'lodash';
import {green, red, gray, cyan, yellow, bold} from 'chalk';
import ora from 'ora';
import cliSpinners from 'cli-spinners';
import windowSize from 'window-size';
import sliceANSI from 'slice-ansi';
import fetch from 'node-fetch';
import strictUriEncode from 'strict-uri-encode';
import JSON5 from 'json5';
import YAML from 'js-yaml';
// import t from 'flow-runtime';

export async function loadFile(file: string, {parse = false} = {}) {
  let data;

  try {
    data = await readFile(file, 'utf8');
  } catch (_) {
    throw new Error(`File not found: ${formatPath(file)}`);
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

export async function saveFile(file: string, data, {stringify = false} = {}) {
  if (stringify) {
    const ext = extname(file);
    if (ext === '.json5') {
      data = JSON5.stringify(data, undefined, 2);
    } else if (ext === '.json') {
      data = JSON.stringify(data, undefined, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      data = YAML.safeDump(data);
    } else {
      throwUserError(`Unsupported file format: ${formatPath(ext)}`, {
        context: {file}
      });
    }
  }

  await writeFile(file, data);
}

let _runDir;
export function getRunDir() {
  if (!_runDir) {
    const dir = join(homedir(), '.run');
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    _runDir = dir;
  }
  return _runDir;
}

export function isYarnPreferred({pkgDir, yarn}) {
  if (yarn !== undefined) {
    return Boolean(yarn);
  }

  const execPath = process.env.npm_execpath;
  if (execPath && execPath.endsWith('yarn.js')) {
    return true;
  }

  if (existsSync(join(pkgDir, 'yarn.lock'))) {
    return true;
  }

  return false;
}

export function generateDeploymentName({name, version, stage, key, maxLength}) {
  if (name.slice(0, 1) === '@') {
    name = name.slice(1);
  }
  name = name.replace(/\//g, '-');

  version = createCompatibleVersionRange(version);

  if (maxLength) {
    maxLength -= '-'.length;
    maxLength -= version.length;
    maxLength -= '-'.length;
    maxLength -= stage.length;
    if (key) {
      maxLength -= '-'.length;
      maxLength -= key.length;
    }
    if (name.length > maxLength) {
      let maxLeft = Math.floor(maxLength / 2);
      let maxRight = Math.floor(maxLength / 2);
      const rest = maxLength - maxLeft - maxRight;
      if (rest) {
        maxRight += rest;
      }
      maxLeft -= '-'.length;
      name = name.substr(0, maxLeft) + '-' + name.substr(-maxRight);
    }
  }

  let deploymentName = `${name}-${version}-${stage}`;

  if (key) {
    deploymentName += '-' + key;
  }

  deploymentName = deploymentName.replace(/\./g, '-');

  return deploymentName;
}

function createCompatibleVersionRange(version: string) {
  const major = semver.major(version);
  if (major >= 1) {
    return `${major}.x.x`;
  }
  const minor = semver.minor(version);
  return `${major}.${minor}.x`;
}

export function showIntro(pkg) {
  console.log(`${bold(pkg.displayName || pkg.name)} ${gray(`v${pkg.version}`)}`);
}

export function showOutro(message, info) {
  let text = green('Voilà!');
  if (message) {
    text += ' ' + message;
  }
  text = bold(text);
  if (info) {
    text += ' ' + gray(info);
  }
  console.log(text);
}

export function showCommandIntro(action, {name, stage, info} = {}) {
  let message = green(action);
  if (name || info) {
    if (name) {
      message += ' ' + name;
      if (stage) {
        message += ' (' + stage + ')';
      }
    }
    if (info) {
      message += ' ' + info;
    }
    message += '...';
  } else {
    message += green('...');
  }
  message = bold(message);
  console.log(message);
}

export async function task(fn: () => mixed, {intro, outro, debug, verbose}) {
  let progress;

  if (debug || verbose) {
    progress = {
      outro,
      start() {
        return this;
      },
      complete() {
        console.log(getSuccessSymbol() + '  ' + this.outro);
        return this;
      },
      fail() {
        return this;
      },
      setMessage(message) {
        console.log(getRunningSymbol() + '  ' + message);
        return this;
      },
      setOutro(message) {
        this.outro = message;
        return this;
      }
    };
  } else {
    progress = {
      spinner: ora({
        spinner: cliSpinners.runner
      }),
      outro,
      start() {
        this.spinner.start();
        return this;
      },
      complete() {
        this.spinner.stopAndPersist({
          text: this.outro,
          symbol: getSuccessSymbol() + ' '
        });
        return this;
      },
      fail() {
        this.spinner.stopAndPersist({
          symbol: getErrorSymbol() + ' '
        });
        return this;
      },
      setMessage(message) {
        this.spinner.text = adjustToWindowWidth(message, {leftMargin: 3});
        return this;
      },
      setOutro(message) {
        this.outro = message;
        return this;
      }
    };
  }

  progress.setMessage(intro).start();

  try {
    const result = await fn(progress);
    progress.complete();
    return result;
  } catch (err) {
    progress.fail();
    throw err;
  }
}

export function formatMessage(message: string, {info, status} = {}) {
  if (info) {
    info = ` ${gray(`(${info})`)}`;
  } else {
    info = '';
  }

  if (status === 'success') {
    status = getSuccessSymbol() + '  ';
  } else if (status === 'error') {
    status = getErrorSymbol() + '  ';
  } else if (status === 'info') {
    status = 'ℹ️️  ';
  } else if (status === 'deployed') {
    status = '🚀  ';
  } else if (status === undefined) {
    status = '';
  } else {
    throw new Error('Invalid status: ' + status);
  }

  return `${status}${message}${info}`;
}

// const SUCCESS_SYMBOLS = [
//   '👍',
//   '👍🏻',
//   '👍🏼',
//   '👍🏽',
//   '👍🏾',
//   '👍🏿',
//   '👌',
//   '👌🏻',
//   '👌🏼',
//   '👌🏽',
//   '👌🏾',
//   '👌🏿',
//   '✌️️',
//   '✌️🏻',
//   '✌️🏼',
//   '✌️🏽',
//   '✌️🏾',
//   '✌️🏿'
// ];

export function getRunningSymbol() {
  return '🏃';
}

export function getSuccessSymbol() {
  // return SUCCESS_SYMBOLS[Math.floor(Math.random() * SUCCESS_SYMBOLS.length)];
  return '⚡';
}

export function getErrorSymbol() {
  return '😡';
}

export function formatString(string: string) {
  return yellow("'" + string + "'");
}

export function formatURL(url: string) {
  return cyan.underline(url);
}

export function formatPath(path: string) {
  return yellow("'" + path + "'");
}

export function formatCode(code: string) {
  return cyan('`' + code + '`');
}

export function adjustToWindowWidth(text: string, {leftMargin = 0, rightMargin = 0} = {}) {
  return sliceANSI(text, 0, windowSize.width - leftMargin - rightMargin);
}

export function createUserError(
  message: string,
  {info, type, context, hidden, capturedStandardError} = {}
) {
  message = red(message);
  if (info) {
    message += ' ' + info;
  }
  if (context) {
    context = entries(context).map(([key, value]) => key + ': ' + formatString(value));
    if (context.length) {
      message += ' (' + context.join(', ') + ')';
    }
  }
  const err = new Error(message);
  if (type) {
    err.type = type;
  }
  err.userError = true;
  if (hidden) {
    err.hidden = true;
  }
  if (capturedStandardError) {
    err.capturedStandardError = capturedStandardError;
  }
  return err;
}

export function throwUserError(message: string, opts) {
  throw createUserError(message, opts);
}

export function showError(error) {
  let stdErr = error.capturedStandardError;
  if (stdErr) {
    stdErr = stdErr.trim();
    if (stdErr) {
      console.error(stdErr);
    }
  }

  if (process.env.RUN_DEBUG) {
    console.error(error);
    return;
  }

  if (error.hidden) {
    return;
  }

  console.error(error.message);

  if (error.contextStack) {
    for (const context of error.contextStack) {
      let identifier = gray((context.constructor && context.constructor.name) || 'Object');
      if (context.toIdentifier) {
        identifier += gray(': ') + formatString(context.toIdentifier());
      }
      console.error('  ' + identifier);
    }
  }

  // if (typeof error === 'string') {
  //   error = throwUserError(error);
  // }
  // if (error.userError) {
  //   const stdErr = error.capturedStandardError && error.capturedStandardError.trim();
  //   if (stdErr) {
  //     console.error(stdErr);
  //   }
  //   if (!error.hidden) {
  //     const message = formatMessage(error.message, {status: 'error'});
  //     console.error(message);
  //   }
  // } else {
  //   console.error(error);
  // }
}

export function showErrorAndExit(error, code = 1) {
  showError(error);
  process.exit(code);
}

export function getProperty(obj, names) {
  if (!Array.isArray(names)) {
    names = [names];
  }
  let result;
  let previousName;
  for (const name of names) {
    if (name in obj) {
      if (previousName) {
        throw new Error(
          `Can't have both ${formatCode(previousName)} and ${formatCode(name)} properties in the same object`
        );
      }
      result = obj[name];
      previousName = name;
    }
  }
  return result;
}

export function setProperty(target, source, name, aliases = []) {
  const keys = [name, ...aliases];
  let previousKey;
  for (const key of keys) {
    if (key in source) {
      if (previousKey) {
        throw new Error(
          `Can't have both ${formatCode(previousKey)} and ${formatCode(key)} properties in the same object`
        );
      }
      target[name] = source[key];
      previousKey = key;
    }
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

export function getAWSConfig(defaults, env, config, argv) {
  const accessKeyId = argv['aws-access-key-id'] || config.accessKeyId || env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    showErrorAndExit(
      "'aws-access-key-id' parameter or 'AWS_ACCESS_KEY_ID' environment variable is missing"
    );
  }

  const secretAccessKey =
    argv['aws-secret-access-key'] || config.secretAccessKey || env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    showErrorAndExit(
      "'aws-secret-access-key' parameter or 'AWS_SECRET_ACCESS_KEY' environment variable is missing"
    );
  }

  const region = argv['aws-region'] || config.region || env.AWS_REGION || defaults.region;

  return {accessKeyId, secretAccessKey, region};
}

export function getEnvironmentConfig(configEnvironment, argvEnvironment) {
  const environment = {};

  Object.assign(environment, configEnvironment);

  if (argvEnvironment === undefined) {
    argvEnvironment = [];
  } else if (typeof argvEnvironment === 'string') {
    argvEnvironment = [argvEnvironment];
  }
  for (const item of argvEnvironment) {
    const [key, value, ...rest] = item.split('=');
    if (!key || !value || rest.length) {
      showErrorAndExit(`'environment' parameter is invalid (${item})`);
    }
    environment[key] = value;
  }

  return environment;
}

export function generateHash(data, algorithm = 'sha256') {
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

export async function fetchJSON(url: string, options = {}) {
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
    throw new Error(`Unexpected ${response.status} HTTP status`);
  }

  const result = await response.json();

  if (cacheFile) {
    await outputFile(cacheFile, JSON.stringify(result));
  }

  return result;
}

export function addContextToErrors(targetOrFn, _key, descriptor) {
  if (typeof targetOrFn === 'function') {
    // A function is passed
    return _addContextToErrors(targetOrFn);
  }

  // Decorator
  const oldFn = descriptor.value;
  const newFn = _addContextToErrors(oldFn);
  Object.defineProperty(newFn, 'name', {value: oldFn.name, configurable: true});
  descriptor.value = newFn;
  return descriptor;
}

function _addContextToErrors(fn) {
  return function(...args) {
    const rethrow = err => {
      if (!err.contextStack) {
        err.contextStack = [];
      }
      err.contextStack.push(this);
      throw err;
    };

    try {
      let result = fn.apply(this, args);
      if (result && typeof result.then === 'function') {
        result = result.catch(rethrow);
      }
      return result;
    } catch (err) {
      rethrow(err);
    }
  };
}

export async function catchError(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
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

export function compactObject(obj: Object) {
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

export function parseCommandLineArguments(argsAndOpts: Array) {
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

// export const NotEmptyStringType = t.refinement(t.string(), str => {
//   console.log(`'${str}'`);
//   if (str.length === 0) {
//     return 'cannot be empty';
//   }
// });
