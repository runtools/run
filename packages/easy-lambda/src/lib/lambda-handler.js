'use strict';

import Lambda from 'aws-sdk/clients/lambda';
import task from './task';

export async function createOrUpdateLambdaFunction({ name, role, code, awsConfig }) {
  const lambda = new Lambda(awsConfig);

  const lambdaFunction = await task(`${name}: Checking lambda function`, async () => {
    try {
      return await lambda.getFunctionConfiguration({
        FunctionName: name
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
    return await task(`${name}: Creating lambda function`, async () => {
      const lambdaFunction = await lambda.createFunction({
        FunctionName: name,
        Handler: 'handler.handler',
        Role: role,
        Runtime: 'nodejs4.3',
        Code: { ZipFile: code }
      }).promise();

      return lambdaFunction.FunctionArn;
    });
  }

  async function updateLambdaFunction({ existingLambdaFunction }) {
    return await task(`${name}: Updating lambda function`, async () => {
      if (role !== existingLambdaFunction.Role) {
        await lambda.updateFunctionConfiguration({
          FunctionName: name,
          Role: role
        }).promise();
      }

      const lambdaFunction = await lambda.updateFunctionCode({
        FunctionName: name,
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
