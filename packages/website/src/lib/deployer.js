'use strict';

import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';
import { remove } from 'fs-promise';
import { generateDeploymentName } from '@voila/common';
import { bundle } from './bundler';

export async function deploy({ entryFile, name, version, stage, awsConfig }) {
  const deploymentName = generateDeploymentName({ name, version, stage });
  const outputDir = join(
    tmpdir(), 'voila-website', 'deployer', 'outputs', deploymentName
  );
  await remove(outputDir);

  const inputDir = dirname(entryFile);
  const file = basename(entryFile);
  await bundle({ inputDir, outputDir, file });
  console.log(outputDir);

  return { deploymentURL: 'http://3base.com' };
}
