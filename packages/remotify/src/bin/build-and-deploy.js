#!/usr/bin/env node

'use strict';

import { join, resolve } from 'path';
import minimist from 'minimist';
import chalk from 'chalk';
import { getAWSConfig } from 'easy-lambda';
import { buildAndDeploy } from '../lib/builder-and-deployer';
import { showErrorAndExit } from '../lib/error';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'role',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let inputDir = argv['input-dir'] || argv._[0] || process.cwd();
inputDir = resolve(process.cwd(), inputDir);

const outputDir = join(inputDir, '.remotify');

const role = argv.role;

const awsConfig = getAWSConfig(argv);

(async function() {
  const name = await buildAndDeploy({ inputDir, outputDir, role, awsConfig });
  console.log(`${chalk.green('✔')} ${name}: Build and deployment completed`);
})().catch(showErrorAndExit);
