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
    'entry-file',
    'role',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let entryFile = argv['entry-file'] || argv._[0];
if (!entryFile) {
  showErrorAndExit('\'entry-file\' parameter is missing');
}
entryFile = resolve(process.cwd(), entryFile);

const name = argv.name;
if (!name) {
  showErrorAndExit('\'name\' parameter is missing');
}

const role = argv.role;

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({ name, entryFile, role, awsConfig });
  console.log(`${chalk.green('✔')} ${name}: Deployment completed ${chalk.gray(`(${apiURL})`)}`);
})().catch(showErrorAndExit);
