'use strict';

import { bundle } from './bundler';
import { zip } from './archiver';
import task from './task';
import { ensureDefaultRole } from './iam-handler';
import { createOrUpdateLambdaFunction } from './lambda-handler';
import { createOrUpdateAPIGateway } from './api-gateway-handler';

export async function deploy({ name, inputFile, role, awsConfig }) {
  if (!role) role = await ensureDefaultRole({ name, awsConfig });

  let code;
  await task(`${name}: Packaging service code`, async () => {
    code = await bundle({ inputFile });
    code = await zip({ data: code, name: 'handler.js' });
  });

  const lambdaFunctionARN = await createOrUpdateLambdaFunction({
    name, role, code, awsConfig
  });

  const apiURL = await createOrUpdateAPIGateway({ name, lambdaFunctionARN, awsConfig });

  return apiURL;
}
