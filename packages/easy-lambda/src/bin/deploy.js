#!/usr/bin/env node

'use strict';

import { resolve, join } from 'path';
import minimist from 'minimist';
import { getAWSConfig, formatMessage, showErrorAndExit, parseEnvironmentParameter } from 'remotify-common';
import { deploy } from '../lib/deployer';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
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

const pkg = require(join(inputDir, 'package.json'));
const { name, version } = pkg;
const entryFile = join(inputDir, pkg.main || 'index.js');

const stage = argv.stage || 'development';

const role = argv.role;

const environment = parseEnvironmentParameter(argv.environment || argv.env);

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({
    name, version, stage, entryFile, role, environment, awsConfig
  });
  console.log(formatMessage({ status: 'success', name, stage, message: 'Deployment completed', info: apiURL }));
})().catch(showErrorAndExit);
