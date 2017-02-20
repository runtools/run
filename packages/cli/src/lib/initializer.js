'use strict';

import { basename } from 'path';
import { exec } from 'child-process-promise';
import fetch from 'node-fetch';
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import Fuse from 'fuse.js';
import { getPackage, putPackage, showCommandIntro, formatMessage, isYarnPreferred, task } from '@voila/common';
import { run } from './runner';

inquirer.registerPrompt('autocomplete', autocomplete);

const NPMS_API_URL = 'https://api.npms.io/v2';

export async function initialize({ pkgDir, type, yarn }) {
  let pkg = getPackage(pkgDir, false);
  const isNew = !pkg;
  if (isNew) {
    pkg = {
      name: basename(pkgDir),
      version: '0.1.0',
      private: true
    };
  }

  if (!pkg.voila) pkg.voila = {};

  if (!type) type = pkg.voila.type;

  showCommandIntro('Initializing', { info: type });

  if (!type) type = await askType();

  const oldType = pkg.voila.type;
  pkg.voila.type = type;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Name:',
      default: pkg.name
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: pkg.version
    },
    {
      type: 'confirm',
      name: 'public',
      message: 'Public package?',
      default: !pkg.private
    }
  ]);

  pkg.name = answers.name;
  pkg.version = answers.version;
  pkg.private = answers.public ? undefined : true;

  if (!pkg.private) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: pkg.description
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: pkg.author
      },
      {
        type: 'input',
        name: 'repository',
        message: 'Git repository:',
        default: pkg.repository && pkg.repository.url || pkg.repository
      },
      {
        type: 'input',
        name: 'license',
        message: 'License:',
        default: pkg.license || 'MIT'
      }
    ]);

    pkg.description = answers.description || undefined;
    pkg.author = answers.author || undefined;
    pkg.repository = answers.repository ? { type: 'git', url: answers.repository } : undefined;
    pkg.license = answers.license || undefined;
  }

  putPackage(pkgDir, pkg);

  console.log(formatMessage(
    `File "package.json" ${isNew ? 'created' : 'updated'}`,
    { status: 'success' }
  ));

  if (oldType && oldType !== type) {
    await remove({ pkgDir, type: oldType, yarn });
  }

  await install({ pkgDir, type, yarn });

  const args = [
    'initialize',
    `--package-dir=${pkgDir}`
  ];
  if (yarn != null) args.push(`--yarn=${yarn}`);
  await run({ pkgDir, type, args });
}

async function askType() {
  const packages = await fetchVoilaPackageHandlers();

  const fuse = new Fuse(packages, { keys: ['name'] });

  const answers = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'type',
      message: 'Package type:',
      async source(answersSoFar, input) {
        let choices;
        if (input) {
          choices = fuse.search(input);
        } else {
          choices = packages;
        }
        return choices.map(choice => choice.name);
      }
    }
  ]);

  return answers.type;
}

async function fetchVoilaPackageHandlers() {
  const url = NPMS_API_URL + '/search?q=keywords:voila-package-handler&size=250';
  const response = await fetch(url);
  const json = await response.json();
  const packages = json.results.map(result => ({ name: result.package.name }));
  return packages;
}

async function install({ pkgDir, type, yarn }) {
  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Installing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...`;
  const successMessage = `${type} installed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn add ${type} --dev`;
    } else {
      cmd = `npm install ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}

async function remove({ pkgDir, type, yarn }) {
  const pkg = getPackage(pkgDir);

  if (!(pkg.devDependencies && pkg.devDependencies.hasOwnProperty(type))) return;

  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Removing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...`;
  const successMessage = `${type} removed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn remove ${type} --dev`;
    } else {
      cmd = `npm rm ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}
