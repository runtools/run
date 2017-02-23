'use strict';

import { transform } from './transformer';
import { createOrUpdateBucket, synchronize } from './s3-handler';
import { createOrUpdateCloudFrontDistribution } from './cloud-front-handler';

export async function deploy(opts) {
  const { outputDir } = await transform(opts);

  if (opts.verbose) {
    console.log(`Temporary output directory: ${outputDir}`);
  }

  const { s3WebsiteDomainName } = await createOrUpdateBucket(opts);
  await synchronize({ ...opts, inputDir: outputDir });

  await createOrUpdateCloudFrontDistribution({ ...opts, origin: s3WebsiteDomainName });

  return { deploymentURL: s3WebsiteDomainName };
}
