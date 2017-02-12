'use strict';

import APIGateway from 'aws-sdk/clients/apigateway';
import { generateDeploymentName, task, formatMessage, createUserError } from '@voila/common';
import { addPermissionToLambdaFunction } from './lambda-handler';

export async function createOrUpdateAPIGateway({ name, version, stage, lambdaFunctionARN, awsConfig }) {
  const apiGateway = new APIGateway(awsConfig);

  const message = formatMessage({ name, stage, message: 'Checking API Gateway...' });
  return await task(message, async (currentTask) => {
    const apiName = generateDeploymentName({ name, version, stage });

    let stageName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    if (stageName.slice(0, 1) === '_') { // Handle scoped name case
      stageName = stageName.slice(1);
    }

    let restApiId = await findAPIGateway({ name, version, stage, awsConfig });

    if (!restApiId) {
      restApiId = await createAPIGateway();
    } else {
      await updateAPIGateway({ restApiId });
    }

    const apiURL = `https://${restApiId}.execute-api.${awsConfig.region}.amazonaws.com/${stageName}`;

    return { apiURL };

    async function createAPIGateway() {
      currentTask.setMessage(formatMessage({
        name, stage, message: 'Creating API Gateway...'
      }));
      currentTask.setSuccessMessage(formatMessage({
        name, stage, message: 'API Gateway created'
      }));

      const api = await apiGateway.createRestApi({ name: apiName }).promise();

      const restApiId = api.id;

      await addPermissionToLambdaFunction({ lambdaFunctionARN, restApiId, awsConfig });

      const result = await apiGateway.getResources({ restApiId }).promise();
      const resourceId = result.items[0].id;

      // POST method

      await apiGateway.putMethod({
        restApiId,
        resourceId,
        httpMethod: 'POST',
        authorizationType: 'NONE'
      }).promise();

      await apiGateway.putMethodResponse({
        restApiId,
        resourceId,
        httpMethod: 'POST',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true
        }
      }).promise();

      await apiGateway.putIntegration({
        restApiId,
        resourceId,
        httpMethod: 'POST',
        type: 'AWS',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${awsConfig.region}:lambda:path/2015-03-31/functions/${lambdaFunctionARN}/invocations`
      }).promise();

      await apiGateway.putIntegrationResponse({
        restApiId,
        resourceId,
        httpMethod: 'POST',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': '\'*\''
        }
      }).promise();

      // OPTIONS method (for CORS)

      await apiGateway.putMethod({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        authorizationType: 'NONE'
      }).promise();

      await apiGateway.putMethodResponse({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }).promise();

      await apiGateway.putIntegration({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        type: 'MOCK',
        requestTemplates: {
          'application/json': '{statusCode:200}'
        }
      }).promise();

      await apiGateway.putIntegrationResponse({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': '\'*\'',
          'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token\'',
          'method.response.header.Access-Control-Allow-Methods': '\'POST,OPTIONS\''
        },
        responseTemplates: {
          'application/json': ''
        }
      }).promise();

      // Deployment

      await apiGateway.createDeployment({
        restApiId,
        stageName
      }).promise();

      return restApiId;
    }

    async function updateAPIGateway({ restApiId }) { // eslint-disable-line no-unused-vars
      currentTask.setSuccessMessage(formatMessage({
        name, stage, message: 'API Gateway checked'
      }));
    }
  });
}

export async function deleteAPIGateway({ name, version, stage, awsConfig }) {
  const apiGateway = new APIGateway(awsConfig);

  const message = formatMessage({ name, stage, message: 'Deleting API Gateway...' });
  const successMessage = formatMessage({ name, stage, message: 'API Gateway deleted' });
  return await task(message, successMessage, async (currentTask) => {
    const restApiId = await findAPIGateway({ name, version, stage, awsConfig });

    if (restApiId) {
      await apiGateway.deleteRestApi({ restApiId }).promise();
    } else {
      currentTask.setSuccessMessage(formatMessage({ name, stage, message: 'API Gateway not found' }));
    }
  });
}

async function findAPIGateway({ name, version, stage, awsConfig }) {
  const apiGateway = new APIGateway(awsConfig);

  const apiName = generateDeploymentName({ name, version, stage });

  const limit = 500;
  const result = await apiGateway.getRestApis({ limit }).promise();
  if (result.items.length === limit) {
    throw createUserError(`Wow, you have a lot of APIs in API Gateway (greater than or equal to ${limit})`);
  }

  const api = result.items.find((item) => item.name === apiName);

  return api && api.id;
}
