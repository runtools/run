#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { getAWSConfig } from '../lib/aws';
import { deploy } from '../lib/deployer';
import { format } from '../lib/console';
import { showErrorAndExit } from '../lib/error';

const argv = minimist(process.argv.slice(2), {
  string: [
    'entry-file',
    'name',
    'stage',
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

const stage = argv.stage || 'development';

const role = argv.role;

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({ entryFile, name, stage, role, awsConfig });
  console.log(format({ status: 'success', name, stage, message: 'Deployment completed', info: apiURL }));
})().catch(showErrorAndExit);
