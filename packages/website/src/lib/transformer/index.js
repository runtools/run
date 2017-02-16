'use strict';

import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';
import { remove } from 'fs-promise';
import { generateDeploymentName, formatMessage, task } from '@voila/common';
import { transformFile } from './file';

export async function transform(opts) {
  const message = formatMessage({
    name: opts.name, stage: opts.stage, message: 'Bundling files...'
  });
  const successMessage = formatMessage({
    name: opts.name, stage: opts.stage, message: 'Files bundled'
  });
  return await task(message, successMessage, async (currentTask) => {
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
