#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import chalk from 'chalk';
import { getAWSConfig } from '../lib/aws';
import { deploy } from '../lib/deployer';
import { showErrorAndExit } from '../lib/error';

const argv = minimist(process.argv.slice(2), {
  string: [
    'name',
    'input-file',
    'role',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let inputFile = argv['input-file'] || argv._[0];
if (!inputFile) {
  showErrorAndExit('\'input-file\' parameter is missing');
}
inputFile = resolve(process.cwd(), inputFile);

const name = argv.name;
if (!name) {
  showErrorAndExit('\'name\' parameter is missing');
}

const role = argv.role;

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({ name, inputFile, role, awsConfig });
  console.log(`${chalk.green('✔')} ${name}: Deployment completed ${chalk.gray(`(${apiURL})`)}`);
})().catch(showErrorAndExit);
