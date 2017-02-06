'use strict';

import IAM from 'aws-sdk/clients/iam';
import { task, format } from './console';

const IAM_ROLE_NAME = 'easy-lambda-default-role-v1';
const IAM_POLICY_NAME = 'basic-lambda-policy';

const IAM_ASSUME_ROLE_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com'
      },
      Action: 'sts:AssumeRole'
    }
  ]
};

const IAM_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: [
        'logs:*'
      ],
      Effect: 'Allow',
      Resource: '*'
    }
  ]
};

export async function ensureDefaultRole({ name, stage, awsConfig }) {
  const iam = new IAM(awsConfig);

  const msg = format({ name, stage, message: 'Ensuring IAM default role exists' });
  return await task(msg, async () => {
    try {
      const result = await iam.getRole({ RoleName: IAM_ROLE_NAME }).promise();
      return result.Role.Arn;
    } catch (err) {
      if (err.code !== 'NoSuchEntity') throw err;
    }

    const assumeRolePolicyDocument = JSON.stringify(
      IAM_ASSUME_ROLE_POLICY_DOCUMENT,
      undefined,
      2
    );
    const result = await iam.createRole({
      RoleName: IAM_ROLE_NAME,
      AssumeRolePolicyDocument: assumeRolePolicyDocument
    }).promise();

    const policyDocument = JSON.stringify(IAM_POLICY_DOCUMENT, undefined, 2);
    await iam.putRolePolicy({
      RoleName: IAM_ROLE_NAME,
      PolicyName: IAM_POLICY_NAME,
      PolicyDocument: policyDocument
    }).promise();

    return result.Role.Arn;
  });
}
