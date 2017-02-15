#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { red, gray, bold } from 'chalk';
import bytes from 'bytes';
import { showIntro, getPackage, createUserError, showErrorAndExit, getAWSConfig } from '@voila/common';
import { getLambdaFunctionInfo } from '../lib/lambda-handler';
import { getAPIGatewayInfo } from '../lib/api-gateway-handler';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

(async function() {
  showIntro(require('../../package.json'));

  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'stage',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ]
  });

  let pkgDir = argv['package-dir'];
  if (pkgDir) {
    pkgDir = resolve(process.cwd(), pkgDir);
  } else {
    pkgDir = process.cwd();
  }

  const pkg = getPackage(pkgDir);

  const { name, version } = pkg;

  const config = pkg.voila || {};

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

  const lambda = await getLambdaFunctionInfo({ name, version, stage, awsConfig });
  if (!lambda) throw createUserError(`${red('Lambda function not found!')} Is this module deployed?`);

  const api = await getAPIGatewayInfo({ name, version, stage, awsConfig });
  if (!api) throw createUserError(`${red('API Gateway not found!')}`);

  console.log(bold('Deployment:'));
  console.log(gray('         URL: ') + api.deploymentURL);
  console.log(bold('Lambda function:'));
  console.log(gray('        Name: ') + lambda.name);
  console.log(gray('   Code size: ') + bytes(lambda.codeSize));
  console.log(gray('      Memory: ') + bytes(lambda.memorySize));
  console.log(gray('      Timout: ') + lambda.timeout + ' seconds');
  console.log(gray('     Runtime: ') + lambda.runtime);
  console.log(gray('        Role: ') + lambda.role);
  console.log(gray('  Updated on: ') + lambda.updatedOn);
  console.log(bold('API Gateway:'));
  console.log(gray('        Name: ') + api.name);
  console.log(gray('  Updated on: ') + api.updatedOn);
})().catch(showErrorAndExit);
