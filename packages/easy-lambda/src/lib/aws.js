'use strict';

import { showErrorAndExit } from '../lib/error';

export function getAWSConfig(argv) {
  const accessKeyId = argv['aws-access-key-id'] || process.env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    showErrorAndExit('\'aws-access-key-id\' parameter or \'AWS_ACCESS_KEY_ID\' environment variable is missing');
  }

  const secretAccessKey = argv['aws-secret-access-key'] || process.env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    showErrorAndExit('\'aws-secret-access-key\' parameter or \'AWS_SECRET_ACCESS_KEY\' environment variable is missing');
  }

  const region = argv['aws-region'] || process.env.AWS_REGION || 'us-east-1';

  return { accessKeyId, secretAccessKey, region };
}
