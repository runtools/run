'use strict';

import { exec } from 'child-process-promise';
import { getPackage, putPackage, isYarnPreferred, task, formatMessage } from '@voila/common';
import { run } from './runner';

export async function initialize({ inputDir, stage, type, yarn }) {
  let pkg = getPackage(inputDir);

  const config = pkg.voila || {};

  if (!type) type = config.type;

  if (!type) {
    if ((pkg.main || '').endsWith('.html')) {
      type = '@voila/website';
    } else {
      type = '@voila/module';
    }
    // confirm auto-detect
  }

  if (config.type !== type) {
    await remove({ inputDir, stage, type: config.type, yarn });
  }

  await install({ inputDir, stage, type, yarn });

  if (config.type !== type) {
    pkg = getPackage(inputDir);
    config.type = type;
    pkg.voila = config;
    putPackage(inputDir, pkg);
  }

  const args = [
    'initialize',
    `--input-dir=${inputDir}`,
    `--stage=${stage}`
  ];
  if (yarn != null) args.push(`--yarn=${yarn}`);
  await run({ inputDir, type, args });
}

async function install({ inputDir, stage, type, yarn }) {
  const pkg = getPackage(inputDir);
  const name = pkg.name;

  const yarnPreferred = isYarnPreferred({ inputDir, yarn });

  const message = formatMessage({ name, stage, message: `Installing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...` });
  const successMessage = formatMessage({ name, stage, message: `${type} installed` });
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn add ${type} --dev`;
    } else {
      cmd = `npm install ${type} --save-dev`;
    }
    await exec(cmd, { cwd: inputDir });
  });
}

async function remove({ inputDir, stage, type, yarn }) {
  const pkg = getPackage(inputDir);
  const name = pkg.name;

  if (!(pkg.devDependencies && pkg.devDependencies.hasOwnProperty(type))) return;

  const yarnPreferred = isYarnPreferred({ inputDir, yarn });

  const message = formatMessage({ name, stage, message: `Removing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...` });
  const successMessage = formatMessage({ name, stage, message: `${type} removed` });
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn remove ${type} --dev`;
    } else {
      cmd = `npm rm ${type} --save-dev`;
    }
    await exec(cmd, { cwd: inputDir });
  });
}
