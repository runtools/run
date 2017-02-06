#!/usr/bin/env node

'use strict';

import { join, resolve } from 'path';
import minimist from 'minimist';
import { buildAndDeploy } from '../lib/builder-and-deployer';
import { formatMessage, showErrorAndExit, parseEnvironmentParameter, getAWSConfig } from 'remotify-common';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'output-dir',
    'stage',
    'role',
    'environment',
    'env',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let inputDir = argv['input-dir'] || argv._[0];
if (!inputDir) {
  showErrorAndExit('\'input-dir\' parameter is missing');
}
inputDir = resolve(process.cwd(), inputDir);

const { name, version } = require(join(inputDir, 'package.json'));

const outputDir = argv['output-dir'] || join(inputDir, '.remotify');

const stage = argv.stage || 'development';

const role = argv.role;

const environment = parseEnvironmentParameter(argv.environment || argv.env);

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await buildAndDeploy({ inputDir, outputDir, name, version, stage, role, environment, awsConfig });
  console.log(formatMessage({ status: 'success', name, stage, message: 'Build and deployment completed', info: apiURL }));
})().catch(showErrorAndExit);
