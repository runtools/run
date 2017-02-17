'use strict';

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { green, red, gray, bold } from 'chalk';
import ora from 'ora';
import windowSize from 'window-size';
import sliceANSI from 'slice-ansi';

export function getPackage(dir) {
  const packageFile = join(dir, 'package.json');
  if (!existsSync(packageFile)) {
    throw createUserError('No npm package found at', dir);
  }
  const json = readFileSync(packageFile, 'utf8');
  const pkg = JSON.parse(json);
  return pkg;
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

export function packageTypeToExecutableName(type) {
  let name = type;
  if (name.slice(0, 1) === '@') name = name.slice(1);
  name = name.replace(/\//g, '-');
  return name;
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

export function showOutro(message = '') {
  console.log(bold(green('Voilà!') + ' ' + message));
}

export async function task(message, successMessage, fn) {
  if (typeof successMessage === 'function') {
    fn = successMessage;
    successMessage = undefined;
  }

  const spinner = ora(truncate(message)).start();

  const currentTask = {
    setMessage(message) { spinner.text = truncate(message); },
    setSuccessMessage(message) { successMessage = message; }
  };

  try {
    const result = await fn(currentTask);
    spinner.succeed(successMessage);
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }

  function truncate(message) {
    return sliceANSI(message, 0, windowSize.width - 2);
  }
}

export function formatMessage({ status, name, stage, message, info }) {
  if (status === 'success') {
    status = `${green('✔')} `;
  } else if (status === 'error') {
    status = `${red('✘')} `;
  } else if (status === undefined) {
    status = '';
  } else {
    throw new Error('Invalid status: ' + status);
  }

  let nameAndStage;
  if (name) {
    nameAndStage = name;
    if (stage) nameAndStage += ` (${stage})`;
    nameAndStage += ':';
    nameAndStage = gray(nameAndStage);
    nameAndStage += ' ';
  } else {
    nameAndStage = '';
  }

  if (info) {
    info = ` ${gray(`(${info})`)}`;
  } else {
    info = '';
  }

  return `${status}${nameAndStage}${message}${info}`;
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
    const message = formatMessage({ status: 'error', message: error.message });
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
