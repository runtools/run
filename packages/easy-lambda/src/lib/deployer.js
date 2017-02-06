'use strict';

import { bundle } from './bundler';
import { zip } from './archiver';
import { task, format } from './console';
import { ensureDefaultRole } from './iam-handler';
import { createOrUpdateLambdaFunction } from './lambda-handler';
import { createOrUpdateAPIGateway } from './api-gateway-handler';

export async function deploy({ entryFile, name, stage, role, awsConfig }) {
  if (!role) role = await ensureDefaultRole({ name, stage, awsConfig });

  let code;
  const msg = format({ name, stage, message: 'Packaging service code' });
  await task(msg, async () => {
    code = await bundle({ entryFile });
    code = await zip({ data: code, filename: 'handler.js' });
  });

  const lambdaFunctionARN = await createOrUpdateLambdaFunction({
    name, stage, role, code, awsConfig
  });

  const apiURL = await createOrUpdateAPIGateway({ name, stage, lambdaFunctionARN, awsConfig });

  return apiURL;
}
