'use strict';

import APIGateway from 'aws-sdk/clients/apigateway';
import task from './task';
import { createUserError } from './error';
import { addPermissionToLambdaFunction } from './lambda-handler';

export async function createOrUpdateAPIGateway({ name, lambdaFunctionARN, awsConfig }) {
  const apiGateway = new APIGateway(awsConfig);

  let api = await task(`${name}: Checking API gateway`, async () => {
    const limit = 500;
    const result = await apiGateway.getRestApis({ limit }).promise();
    if (result.items.length === limit) {
      throw createUserError(`Wow, you have a lot of APIs in API Gateway (greater than or equal to ${limit})`);
    }
    return result.items.find((item) => item.name === name);
  });

  const stageName = name.replace(/[^a-zA-Z0-9_]/g, '_');

  if (!api) {
    api = await createAPIGateway({ stageName });
  } else {
    await updateAPIGateway({ restApiId: api.id, stageName });
  }

  return `https://${api.id}.execute-api.${awsConfig.region}.amazonaws.com/${stageName}`;

  async function createAPIGateway() {
    return await task(`${name}: Creating API Gateway`, async () => {
      const api = await apiGateway.createRestApi({ name }).promise();

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

      return api;
    });
  }

  async function updateAPIGateway({ restApiId }) {
    return await task(`${name}: Updating API Gateway`, async () => {
      // TODO
    });
  }
}
