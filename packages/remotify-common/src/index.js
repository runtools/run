'use strict';

import chalk from 'chalk';
import ora from 'ora';

export async function task(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn(spinner);
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

export function formatMessage({ status, name, stage, message, info }) {
  if (status === 'success') {
    status = `${chalk.green('✔')} `;
  } else if (status === 'error') {
    status = `${chalk.red('✘')} `;
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
    nameAndStage = chalk.gray(nameAndStage);
    nameAndStage += ' ';
  } else {
    nameAndStage = '';
  }

  if (info) {
    info = ` ${chalk.gray(`(${info})`)}`;
  } else {
    info = '';
  }

  return `${status}${nameAndStage}${message}${info}`;
}

export function createUserError(message) {
  const err = new Error(message);
  err.userError = true;
  return err;
}

export function showError(error) {
  if (typeof error === 'string') {
    error = createUserError(error);
  }
  if (error.userError) {
    console.error(formatMessage({ status: 'error', message: error.message }));
  } else {
    console.error(error);
  }
}

export function showErrorAndExit(error, code = 1) {
  showError(error);
  process.exit(code);
}

export function getAWSConfig(argv) {
  const accessKeyId = argv['aws-access-key-id'] || process.env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    showErrorAndExit('\'aws-access-key-id\' parameter or \'AWS_ACCESS_KEY_ID\' environment variable is missing');
  }

  const secretAccessKey = argv['aws-secret-access-key'] || process.env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    showErrorAndExit('\'aws-secret-access-key\' parameter or \'AWS_SECRET_ACCESS_KEY\' environment variable is missing');
  }

  const region = argv['aws-region'] || process.env.AWS_REGION || 'us-east-1';

  return { accessKeyId, secretAccessKey, region };
}

export function parseEnvironmentParameter(env) {
  if (env == null) {
    env = [];
  } else if (typeof env === 'string') {
    env = [env];
  }
  const environment = {};
  for (const item of env) {
    const [key, value, ...rest] = item.split('=');
    if (!key || !value || rest.length) {
      showErrorAndExit(`'environment' parameter is invalid (${item})`);
    }
    environment[key] = value;
  }
  return environment;
}
