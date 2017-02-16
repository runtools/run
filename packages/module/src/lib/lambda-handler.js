'use strict';

import Lambda from 'aws-sdk/clients/lambda';
import isEqual from 'lodash.isequal';
import { generateDeploymentName, task, formatMessage } from '@voila/common';
import sleep from 'sleep-promise';

export async function createOrUpdateLambdaFunction({ name, version, stage, role, roleHasJustBeenCreated, memorySize, timeout, environment, archive, awsConfig }) {
  const lambda = new Lambda({ ...awsConfig, apiVersion: '2015-03-31' });

  const message = formatMessage({
    name, stage, message: 'Checking lambda function...'
  });
  return await task(message, async (currentTask) => {
    const lambdaFunctionName = generateDeploymentName({ name, version, stage });

    const lambdaFunction = await getLambdaFunctionConfiguration({
      name, version, stage, awsConfig
    });
    if (!lambdaFunction) {
      return await createLambdaFunction();
    } else {
      return await updateLambdaFunction({ existingLambdaFunction: lambdaFunction });
    }

    async function createLambdaFunction() {
      currentTask.setMessage(formatMessage({
        name, stage, message: 'Creating lambda function...'
      }));
      currentTask.setSuccessMessage(formatMessage({
        name, stage, message: 'Lambda function created'
      }));
      let errors = 0;
      while (true) {
        try {
          const lambdaFunction = await lambda.createFunction({
            FunctionName: lambdaFunctionName,
            Handler: 'handler.handler',
            Runtime: 'nodejs4.3',
            Role: role,
            MemorySize: memorySize,
            Timeout: timeout,
            Environment: { Variables: environment },
            Code: { ZipFile: archive }
          }).promise();

          return { lambdaFunctionARN: lambdaFunction.FunctionArn };
        } catch (err) {
          errors++;
          const roleMayNotBeReady = err.code === 'InvalidParameterValueException' && roleHasJustBeenCreated && errors <= 10;
          if (!roleMayNotBeReady) throw err;
          await sleep(3000);
        }
      }
    }

    async function updateLambdaFunction({ existingLambdaFunction }) {
      currentTask.setMessage(formatMessage({
        name, stage, message: 'Updating lambda function...'
      }));
      currentTask.setSuccessMessage(formatMessage({
        name, stage, message: 'Lambda function updated'
      }));

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
        let updated = false;
        let errors = 0;
        while (!updated) {
          try {
            await lambda.updateFunctionConfiguration({
              FunctionName: lambdaFunctionName,
              Role: role,
              MemorySize: memorySize,
              Timeout: timeout,
              Environment: { Variables: environment }
            }).promise();
            updated = true;
          } catch (err) {
            errors++;
            const roleMayNotBeReady = err.code === 'InvalidParameterValueException' && roleHasJustBeenCreated && errors <= 10;
            if (!roleMayNotBeReady) throw err;
            await sleep(3000);
          }
        }
      }

      const lambdaFunction = await lambda.updateFunctionCode({
        FunctionName: lambdaFunctionName,
        ZipFile: archive
      }).promise();

      return { lambdaFunctionARN: lambdaFunction.FunctionArn };
    }
  });
}

async function getLambdaFunctionConfiguration({ name, version, stage, awsConfig }) {
  const lambda = new Lambda({ ...awsConfig, apiVersion: '2015-03-31' });

  const lambdaFunctionName = generateDeploymentName({ name, version, stage });

  try {
    return await lambda.getFunctionConfiguration({
      FunctionName: lambdaFunctionName
    }).promise();
  } catch (err) {
    if (err.code !== 'ResourceNotFoundException') throw err;
    return undefined;
  }
}

export async function getLambdaFunctionInfo({ name, version, stage, awsConfig }) {
  const message = formatMessage({
    name, stage, message: 'Fetching lambda function information...'
  });
  const successMessage = formatMessage({
    name, stage, message: 'Lambda function information fetched'
  });
  return await task(message, successMessage, async () => {
    const result = await getLambdaFunctionConfiguration({
      name, version, stage, awsConfig
    });
    if (!result) return undefined;
    return {
      name: result.FunctionName,
      codeSize: result.CodeSize,
      memorySize: result.MemorySize * 1024 * 1024,
      timeout: result.Timeout,
      runtime: result.Runtime,
      role: result.Role,
      updatedOn: new Date(result.LastModified)
    };
  });
}

export async function addPermissionToLambdaFunction({ lambdaFunctionARN, restApiId, awsConfig }) {
  const lambda = new Lambda({ ...awsConfig, apiVersion: '2015-03-31' });

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

export async function removeLambdaFunction({ name, version, stage, awsConfig }) {
  const lambda = new Lambda({ ...awsConfig, apiVersion: '2015-03-31' });

  const message = formatMessage({
    name, stage, message: 'Deleting lambda function...'
  });
  const successMessage = formatMessage({
    name, stage, message: 'Lambda function removed'
  });
  return await task(message, successMessage, async (currentTask) => {
    const lambdaFunctionName = generateDeploymentName({ name, version, stage });

    try {
      await lambda.deleteFunction({ FunctionName: lambdaFunctionName }).promise();
    } catch (err) {
      if (err.code !== 'ResourceNotFoundException') throw err;
      currentTask.setSuccessMessage(formatMessage({
        name, stage, message: 'Lambda function not found'
      }));
    }
  });
}
