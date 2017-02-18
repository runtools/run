'use strict';

import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';
import { remove } from 'fs-promise';
import { generateDeploymentName, task } from '@voila/common';
import { transformFile } from './file';

export async function transform(opts) {
  return await task('Bundling files...', 'Files bundled', async (currentTask) => {
    const deploymentName = generateDeploymentName(opts);
    const outputDir = join(
      tmpdir(), 'voila-website', 'deployer', 'outputs', deploymentName
    );

    await remove(outputDir);

    const inputDir = dirname(opts.entryFile);
    const file = basename(opts.entryFile);
    await transformFile({ ...opts, inputDir, outputDir, file, currentTask });

    return { outputDir };
  });
}
