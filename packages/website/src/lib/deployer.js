'use strict';

import { transform } from './transformer';
import { createOrUpdateBucket, synchronize } from './s3-handler';

export async function deploy(opts) {
  const { outputDir } = await transform(opts);

  if (opts.verbose) {
    console.log(`Temporary output directory: ${outputDir}`);
  }

  await createOrUpdateBucket(opts);
  await synchronize({ ...opts, inputDir: outputDir });

  return { deploymentURL: 'http://3base.com' };
}
