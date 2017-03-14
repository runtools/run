import {join, extname} from 'path';
import {existsSync, mkdirSync, readFileSync, writeFileSync, statSync} from 'fs';
import {outputFile} from 'fs-promise';
import {homedir, tmpdir} from 'os';
import crypto from 'crypto';
import semver from 'semver';
import pick from 'lodash.pick';
import {green, red, gray, cyan, yellow, bold} from 'chalk';
import ora from 'ora';
import cliSpinners from 'cli-spinners';
import windowSize from 'window-size';
import sliceANSI from 'slice-ansi';
import fetch from 'node-fetch';
import strictUriEncode from 'strict-uri-encode';
import JSON5 from 'json5';
import YAML from 'js-yaml';

export function readFile(file, {parse = false} = {}) {
  let data;
  try {
    data = readFileSync(file, 'utf8');
  } catch (_) {
    throw createUserError(`File not found: ${formatPath(file)}`);
  }

  if (parse) {
    try {
      const ext = extname(file);
      if (ext === '.json5') {
        data = JSON5.parse(data);
      } else if (ext === '.json') {
        data = JSON.parse(data);
      } else if (ext === '.yaml' || ext === '.yml') {
        data = YAML.safeLoad(data);
      } else {
        throw createUserError(`Unsupported file format: ${formatPath(file)}`);
      }
    } catch (err) {
      if (err.userError) {
        throw err;
      }
      throw createUserError(`Invalid file: ${formatPath(file)}`);
    }
  }

  return data;
}

export function writeFile(file, data, {stringify = false} = {}) {
  if (stringify) {
    const ext = extname(file);
    if (ext === '.json5') {
      data = JSON5.stringify(data, undefined, 2);
    } else if (ext === '.json') {
      data = JSON.stringify(data, undefined, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      data = YAML.safeDump(data);
    } else {
      throw createUserError(`Unsupported file format: ${formatPath(file)}`);
    }
  }

  writeFileSync(file, data);
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

function createCompatibleVersionRange(version) {
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

export async function task(message, successMessage, fn) {
  if (typeof successMessage === 'function') {
    fn = successMessage;
    successMessage = undefined;
  }

  const spinner = ora({
    text: adjustToWindowWidth(message, {leftMargin: 3}),
    spinner: cliSpinners.moon
  }).start();

  const currentTask = {
    setMessage(message) {
      spinner.text = adjustToWindowWidth(message, {leftMargin: 3});
    },
    setSuccessMessage(message) {
      successMessage = message;
    }
  };

  try {
    const result = await fn(currentTask);
    spinner.stopAndPersist({
      text: successMessage,
      symbol: getSuccessSymbol() + ' '
    });
    return result;
  } catch (err) {
    spinner.stopAndPersist({
      symbol: getErrorSymbol() + ' '
    });
    throw err;
  }
}

export function formatMessage(message, info, options) {
  if (info !== null && typeof info === 'object') {
    options = info;
    info = undefined;
  }

  let {status} = options || {};

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

const SUCCESS_SYMBOLS = [
  '👍',
  '👍🏻',
  '👍🏼',
  '👍🏽',
  '👍🏾',
  '👍🏿',
  '👌',
  '👌🏻',
  '👌🏼',
  '👌🏽',
  '👌🏾',
  '👌🏿',
  '✌️️',
  '✌️🏻',
  '✌️🏼',
  '✌️🏽',
  '✌️🏾',
  '✌️🏿'
];

export function getSuccessSymbol() {
  return SUCCESS_SYMBOLS[Math.floor(Math.random() * SUCCESS_SYMBOLS.length)];
}

export function getErrorSymbol() {
  return '😡';
}

export function formatURL(url) {
  return cyan.underline(url);
}

export function formatPath(path) {
  return yellow("'" + path + "'");
}

export function formatCode(path) {
  return cyan('`' + path + '`');
}

export function adjustToWindowWidth(text, {leftMargin = 0, rightMargin = 0} = {}) {
  return sliceANSI(text, 0, windowSize.width - leftMargin - rightMargin);
}

export function createUserError(message, info) {
  message = red(message);
  if (info) {
    message += ' ' + info;
  }
  const err = new Error(message);
  err.userError = true;
  return err;
}

export function showError(error) {
  if (typeof error === 'string') {
    error = createUserError(error);
  }
  if (error.userError) {
    const message = formatMessage(error.message, {status: 'error'});
    console.error(message);
  } else {
    console.error(error);
  }
}

export function showErrorAndExit(error, code = 1) {
  showError(error);
  process.exit(code);
}

export function getAWSConfig(defaults, env, config, argv) {
  const accessKeyId = argv['aws-access-key-id'] || config.accessKeyId || env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    showErrorAndExit(
      "'aws-access-key-id' parameter or 'AWS_ACCESS_KEY_ID' environment variable is missing"
    );
  }

  const secretAccessKey = argv['aws-secret-access-key'] ||
    config.secretAccessKey ||
    env.AWS_SECRET_ACCESS_KEY;
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

export async function fetchJSON(url, options = {}) {
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
  Object.assign(opts, pick(options, ['method', 'timeout']));

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
