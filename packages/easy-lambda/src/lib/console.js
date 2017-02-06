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

export function format({ status, name, stage, message, info }) {
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
