'use strict';

import { removeLambdaFunction } from './lambda-handler';
import { removeAPIGateway } from './api-gateway-handler';

export async function remove({ name, version, stage, awsConfig }) {
  await removeAPIGateway({ name, version, stage, awsConfig });
  await removeLambdaFunction({ name, version, stage, awsConfig });
}
