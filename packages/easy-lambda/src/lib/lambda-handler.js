'use strict';

import Lambda from 'aws-sdk/clients/lambda';
import { task, format } from './console';
import { generateDeploymentName } from './tools';

export async function createOrUpdateLambdaFunction({ name, version, stage, role, code, awsConfig }) {
  const lambda = new Lambda(awsConfig);

  const lambdaFunctionName = generateDeploymentName({ name, version, stage });

  const msg = format({
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
    const msg = format({
      name, stage, message: 'Creating lambda function', info: lambdaFunctionName
    });
    return await task(msg, async () => {
      const lambdaFunction = await lambda.createFunction({
        FunctionName: lambdaFunctionName,
        Handler: 'handler.handler',
        Role: role,
        Runtime: 'nodejs4.3',
        Code: { ZipFile: code }
      }).promise();

      return lambdaFunction.FunctionArn;
    });
  }

  async function updateLambdaFunction({ existingLambdaFunction }) {
    const msg = format({
      name, stage, message: 'Updating lambda function', info: lambdaFunctionName
    });
    return await task(msg, async () => {
      if (role !== existingLambdaFunction.Role) {
        await lambda.updateFunctionConfiguration({
          FunctionName: lambdaFunctionName,
          Role: role
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
