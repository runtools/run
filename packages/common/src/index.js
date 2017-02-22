'use strict';

import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { outputFile } from 'fs-promise';
import { tmpdir } from 'os';
import crypto from 'crypto';
import semver from 'semver';
import minimist from 'minimist';
import { green, red, gray, cyan, yellow, bold } from 'chalk';
import ora from 'ora';
import cliSpinners from 'cli-spinners';
import windowSize from 'window-size';
import sliceANSI from 'slice-ansi';
import fetch from 'node-fetch';
import strictUriEncode from 'strict-uri-encode';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

export function getCommonOptions() {
  const pkgDir = getPackageDirOption();

  const pkg = getPackage(pkgDir);
  const { name, version } = pkg;
  const config = pkg.voila || {};

  const argv = minimist(process.argv.slice(2), {
    string: [
      'stage',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ],
    boolean: [
      'verbose'
    ]
  });

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const awsConfig = getAWSConfig(
    { region: DEFAULT_REGION }, process.env, config, argv
  );

  const verbose = argv['verbose'] || config.verbose;

  return { pkgDir, name, version, stage, config, awsConfig, verbose };
}

export function getPackageDirOption(search = true) {
  let pkgDir = getPathOption('package-dir');
  if (!pkgDir) {
    if (search) {
      pkgDir = searchPackageDir(process.cwd());
    } else {
      pkgDir = process.cwd();
    }
  }
  return pkgDir;
}

export function getPathOption(optionName) {
  const argv = minimist(process.argv.slice(2), { string: [optionName] });
  let path = argv[optionName];
  if (path) {
    path = resolve(process.cwd(), path);
  }
  return path;
}

function searchPackageDir(dir) {
  if (existsSync(join(dir, 'package.json'))) return dir;
  const parentDir = join(dir, '..');
  if (parentDir === dir) {
    throw createUserError('No npm package found.', `Please run ${cyan('`voila init <package-type>`')} at the root of your package to initialize it.`);
  }
  return searchPackageDir(parentDir);
}

export function getPackage(dir, errorIfNotFound = true) {
  try {
    const packageFile = join(dir, 'package.json');
    const json = readFileSync(packageFile, 'utf8');
    const pkg = JSON.parse(json);
    return pkg;
  } catch (err) {
    if (!errorIfNotFound) return undefined;
    throw createUserError('No npm package found at', `"${dir}". ${gray('Run `voila init` to initialize your package.')}`);
  }
}

export function putPackage(dir, pkg) {
  const packageFile = join(dir, 'package.json');
  const json = JSON.stringify(pkg, undefined, 2);
  writeFileSync(packageFile, json);
}

export function isYarnPreferred({ pkgDir, yarn }) {
  if (yarn != null) return !!yarn;

  const execPath = process.env.npm_execpath;
  if (execPath && execPath.endsWith('yarn.js')) return true;

  if (existsSync(join(pkgDir, 'yarn.lock'))) return true;

  return false;
}

export function generateDeploymentName({ name, version, stage, key, maxLength }) {
  if (name.slice(0, 1) === '@') name = name.slice(1);
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
      if (rest) maxRight += rest;
      maxLeft -= '-'.length;
      name = name.substr(0, maxLeft) + '-' + name.substr(-maxRight);
    }
  }

  let deploymentName = `${name}-${version}-${stage}`;

  if (key) deploymentName += '-' + key;

  deploymentName = deploymentName.replace(/\./g, '-');

  return deploymentName;
}

function createCompatibleVersionRange(version) {
  const major = semver.major(version);
  if (major >= 1) {
    return `${major}.x.x`;
  } else {
    const minor = semver.minor(version);
    return `${major}.${minor}.x`;
  }
}

export function showIntro(pkg) {
  console.log(`${bold(pkg.displayName || pkg.name)} ${gray(`v${pkg.version}`)}`);
}

export function showOutro(message, info) {
  let text = green('Voilà!');
  if (message) text += ' ' + message;
  text = bold(text);
  if (info) text += ' ' + gray(info);
  console.log(text);
}

export function showCommandIntro(action, { name, stage, info } = {}) {
  let message = green(action);
  if (name || info) {
    if (name) {
      message += ' ' + name;
      if (stage) {
        message += ' (' + stage + ')';
      }
    }
    if (info) message += ' ' + info;
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
    text: truncate(message),
    spinner: cliSpinners.moon
  }).start();

  const currentTask = {
    setMessage(message) { spinner.text = truncate(message); },
    setSuccessMessage(message) { successMessage = message; }
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

  function truncate(message) {
    return sliceANSI(message, 0, windowSize.width - 3);
  }
}

export function formatMessage(message, info, options) {
  if (info !== null && typeof info === 'object') {
    options = info;
    info = undefined;
  }

  let { status } = options || {};

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
  '👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿',
  '👌', '👌🏻', '👌🏼', '👌🏽', '👌🏾', '👌🏿',
  '✌️️', '✌️🏻', '✌️🏼', '✌️🏽', '✌️🏾', '✌️🏿'
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
  return yellow(path);
}

export function createUserError(message, info) {
  message = red(message);
  if (info) message += ' ' + info;
  const err = new Error(message);
  err.userError = true;
  return err;
}

export function showError(error) {
  if (typeof error === 'string') {
    error = createUserError(error);
  }
  if (error.userError) {
    const message = formatMessage(error.message, { status: 'error' });
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
    showErrorAndExit('\'aws-access-key-id\' parameter or \'AWS_ACCESS_KEY_ID\' environment variable is missing');
  }

  const secretAccessKey = argv['aws-secret-access-key'] || config.secretAccessKey || env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    showErrorAndExit('\'aws-secret-access-key\' parameter or \'AWS_SECRET_ACCESS_KEY\' environment variable is missing');
  }

  const region = argv['aws-region'] || config.region || env.AWS_REGION || defaults.region;

  return { accessKeyId, secretAccessKey, region };
}

export function getEnvironmentConfig(configEnvironment, argvEnvironment) {
  const environment = {};

  Object.assign(environment, configEnvironment);

  if (argvEnvironment == null) {
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

export async function getJSON(url, options = {}) {
  let cacheFile;

  if (options.cacheTime) {
    const cacheDir = join(tmpdir(), 'voila-common', 'cache');
    cacheFile = join(cacheDir, strictUriEncode(url));

    let stats;
    try { stats = statSync(cacheFile); } catch (err) { /* File is missing */ }
    if (stats && Date.now() - stats.mtime.getTime() < options.cacheTime) {
      const result = JSON.parse(readFileSync(cacheFile, 'utf8'));
      return result;
    }
  }

  const opts = {
    headers: { 'Accept': 'application/json' }
  };
  if (options.timeout != null) opts.timeout = options.timeout;

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
