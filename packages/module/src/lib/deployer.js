'use strict';

import { buildServer } from './server-builder';
import { ensureDefaultRole } from './iam-handler';
import { createOrUpdateLambdaFunction } from './lambda-handler';
import { createOrUpdateAPIGateway } from './api-gateway-handler';

export async function deploy({ entryFile, name, version, stage, role, memorySize, timeout, environment, awsConfig, bundle, transpile }) {
  let roleHasJustBeenCreated;

  if (!role) {
    const result = await ensureDefaultRole({ name, stage, awsConfig });
    role = result.role;
    roleHasJustBeenCreated = result.hasBeenCreated;
  }

  const { archive } = await buildServer({ entryFile, name, version, stage, bundle, transpile });

  const { lambdaFunctionARN } = await createOrUpdateLambdaFunction({
    name, version, stage, role, roleHasJustBeenCreated,
    memorySize, timeout, environment, archive, awsConfig
  });

  const { apiURL } = await createOrUpdateAPIGateway({
    name, version, stage, lambdaFunctionARN, awsConfig
  });

  return { apiURL };
}
