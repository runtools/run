'use strict';

import { deleteLambdaFunction } from './lambda-handler';
import { deleteAPIGateway } from './api-gateway-handler';

export async function undeploy({ name, version, stage, awsConfig }) {
  await deleteAPIGateway({ name, version, stage, awsConfig });

  await deleteLambdaFunction({ name, version, stage, awsConfig });
}
