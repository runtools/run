#!/usr/bin/env node

'use strict';

import { gray, bold } from 'chalk';
import bytes from 'bytes';
import {
  getCommonOptions, showIntro, showCommandIntro,
  createUserError, showErrorAndExit
} from '@voila/common';
import { getLambdaFunctionInfo } from '../lib/lambda-handler';
import { getAPIGatewayInfo } from '../lib/api-gateway-handler';

(async function() {
  showIntro(require('../../package.json'));

  const { name, version, stage, awsConfig } = getCommonOptions();

  showCommandIntro('Checking', { name, stage });

  const lambda = await getLambdaFunctionInfo({ name, version, stage, awsConfig });
  if (!lambda) throw createUserError('Lambda function not found!', 'Is this module deployed?');

  const api = await getAPIGatewayInfo({ name, version, stage, awsConfig });
  if (!api) throw createUserError('API Gateway not found!');

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
