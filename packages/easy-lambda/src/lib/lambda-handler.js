'use strict';

import Lambda from 'aws-sdk/clients/lambda';
import isEqual from 'lodash.isequal';
import { task, formatMessage } from 'voila-common';
import { generateDeploymentName } from './tools';

export async function createOrUpdateLambdaFunction({ name, version, stage, role, memorySize, timeout, environment, code, awsConfig }) {
  const lambda = new Lambda(awsConfig);

  const lambdaFunctionName = generateDeploymentName({ name, version, stage });

  const msg = formatMessage({
    name, stage, message: 'Checking lambda function', info: lambdaFunctionName
  });
  const lambdaFunction = await task(msg, async () => {
    try {
      return await lambda.getFunctionConfiguration({
        FunctionName: lambdaFunctionName
      }).promise();
    } catch (err) {
      if (err.code === 'ResourceNotFoundException') return undefined;
      throw err;
    }
  });

  if (!lambdaFunction) {
    return await createLambdaFunction();
  } else {
    return await updateLambdaFunction({ existingLambdaFunction: lambdaFunction });
  }

  async function createLambdaFunction() {
    const msg = formatMessage({
      name, stage, message: 'Creating lambda function', info: lambdaFunctionName
    });
    return await task(msg, async () => {
      const lambdaFunction = await lambda.createFunction({
        FunctionName: lambdaFunctionName,
        Handler: 'handler.handler',
        Runtime: 'nodejs4.3',
        Role: role,
        MemorySize: memorySize,
        Timeout: timeout,
        Environment: { Variables: environment },
        Code: { ZipFile: code }
      }).promise();

      return lambdaFunction.FunctionArn;
    });
  }

  async function updateLambdaFunction({ existingLambdaFunction }) {
    const msg = formatMessage({
      name, stage, message: 'Updating lambda function', info: lambdaFunctionName
    });
    return await task(msg, async () => {
      let changed = false;

      if (!changed) {
        changed = role !== existingLambdaFunction.Role;
      }
      if (!changed) {
        changed = memorySize !== existingLambdaFunction.MemorySize;
      }
      if (!changed) {
        changed = timeout !== existingLambdaFunction.Timeout;
      }
      if (!changed) {
        let existingEnvironment = existingLambdaFunction.Environment;
        existingEnvironment = existingEnvironment && existingEnvironment.Variables;
        changed = !isEqual(environment, existingEnvironment);
      }

      if (changed) {
        await lambda.updateFunctionConfiguration({
          FunctionName: lambdaFunctionName,
          Role: role,
          MemorySize: memorySize,
          Timeout: timeout,
          Environment: { Variables: environment }
        }).promise();
      }

      const lambdaFunction = await lambda.updateFunctionCode({
        FunctionName: lambdaFunctionName,
        ZipFile: code
      }).promise();

      return lambdaFunction.FunctionArn;
    });
  }
}

export async function addPermissionToLambdaFunction({ lambdaFunctionARN, restApiId, awsConfig }) {
  const lambda = new Lambda(awsConfig);

  const matches = /arn:aws:.+:.+:(\d+):/.exec(lambdaFunctionARN);
  const accountId = matches && matches[1];
  if (!accountId) throw new Error('Unable to find out the AWS account ID');

  await lambda.addPermission({
    FunctionName: lambdaFunctionARN,
    Action: 'lambda:InvokeFunction',
    Principal: 'apigateway.amazonaws.com',
    StatementId: 'allow_api_gateway',
    SourceArn: `arn:aws:execute-api:${awsConfig.region}:${accountId}:${restApiId}/*/*`
  }).promise();
}
