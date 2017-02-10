'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { buildServer } from './server-builder';
import { bundle } from './bundler';
import { ensureDefaultRole } from './iam-handler';
import { createOrUpdateLambdaFunction } from './lambda-handler';
import { createOrUpdateAPIGateway } from './api-gateway-handler';

export async function deploy({ inputDir, name, version, stage, role, memorySize, timeout, environment, awsConfig }) {
  let roleHasJustBeenCreated;

  if (!role) {
    const result = await ensureDefaultRole({ name, stage, awsConfig });
    role = result.role;
    roleHasJustBeenCreated = result.hasBeenCreated;
  }

  let code;

  const outputDir = join(inputDir, '.voila-temporary');

  try {
    const { serverIndexFile } = await buildServer({
      inputDir, outputDir, name, version, stage
    });

    code = await bundle({ name, stage, serverIndexFile });
  } finally {
    await fsp.remove(outputDir);
  }

  const { lambdaFunctionARN } = await createOrUpdateLambdaFunction({
    name, version, stage, role, roleHasJustBeenCreated,
    memorySize, timeout, environment, code, awsConfig
  });

  const { apiURL } = await createOrUpdateAPIGateway({
    name, version, stage, lambdaFunctionARN, awsConfig
  });

  return { apiURL };
}
