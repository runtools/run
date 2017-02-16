'use strict';

import { transform } from './transformer';

export async function deploy(opts) {
  const { outputDir } = await transform(opts);
  console.log(outputDir);

  return { deploymentURL: 'http://3base.com' };
}
