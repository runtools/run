'use strict';

import { bundle } from './bundler';
import { zip } from './archiver';
import { task, formatMessage } from 'remotify-common';
import { ensureDefaultRole } from './iam-handler';
import { createOrUpdateLambdaFunction } from './lambda-handler';
import { createOrUpdateAPIGateway } from './api-gateway-handler';

export async function deploy({ name, version, stage, entryFile, role, memorySize, timeout, environment, awsConfig }) {
  if (!role) role = await ensureDefaultRole({ name, stage, awsConfig });

  let code;
  const msg = formatMessage({ name, stage, message: 'Packaging service code' });
  await task(msg, async () => {
    code = await bundle({ entryFile });
    code = await zip({ data: code, filename: 'handler.js' });
  });

  const lambdaFunctionARN = await createOrUpdateLambdaFunction({
    name, version, stage, role, memorySize, timeout, environment, code, awsConfig
  });

  const apiURL = await createOrUpdateAPIGateway({
    name, version, stage, lambdaFunctionARN, awsConfig
  });

  return apiURL;
}
