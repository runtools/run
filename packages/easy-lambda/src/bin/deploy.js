#!/usr/bin/env node

'use strict';

import fs from 'fs';
import { join, resolve } from 'path';
import minimist from 'minimist';
import chalk from 'chalk';
import { getAWSConfig } from '../lib/aws';
import { deploy } from '../lib/deployer';
import { showErrorAndExit } from '../lib/error';

// easy-lambda deploy --name=example

// curl -v -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"xyz","method":"subtract","params":[3,2]}' https://60any8n2z6.execute-api.us-east-1.amazonaws.com/remotify_example

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

let pkg;

let inputFile = argv['input-file'] || argv._[0];
if (!inputFile) {
  const pkgFile = join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgFile)) {
    pkg = fs.readFileSync(pkgFile, 'utf8');
    pkg = JSON.parse(pkg);
    inputFile = pkg.main || 'index.js';
    if (!fs.existsSync(inputFile)) inputFile = undefined;
  }
}
if (!inputFile) {
  showErrorAndExit('\'input-file\' parameter is missing');
}
inputFile = resolve(process.cwd(), inputFile);

const name = argv.name || pkg && (pkg.serviceName || pkg.name);
if (!name) {
  showErrorAndExit('\'name\' parameter is missing');
}

const role = argv.role;

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({ name, inputFile, role, awsConfig });
  console.log(`${chalk.green('✔')} ${name}: Deployment completed ${chalk.gray(`(${apiURL})`)}`);
})().catch(showErrorAndExit);
