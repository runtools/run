#!/usr/bin/env node

'use strict';

import { join, resolve } from 'path';
import minimist from 'minimist';
import { getAWSConfig } from 'easy-lambda';
import { buildAndDeploy } from '../lib/builder-and-deployer';
import { format } from '../lib/console';
import { showErrorAndExit } from '../lib/error';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'output-dir',
    'stage',
    'role',
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

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await buildAndDeploy({ inputDir, outputDir, name, version, stage, role, awsConfig });
  console.log(format({ status: 'success', name, stage, message: 'Build and deployment completed', info: apiURL }));
})().catch(showErrorAndExit);
