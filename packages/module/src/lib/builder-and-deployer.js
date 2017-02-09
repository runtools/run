'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { buildServer } from './server-builder';
import { deploy } from './deployer';

export async function buildAndDeploy({ inputDir, name, version, stage, role, memorySize, timeout, environment, awsConfig }) {
  const outputDir = join(inputDir, '.voila-temporary');

  const { serverIndexFile } = await buildServer({
    inputDir, outputDir, name, version, stage
  });

  const { apiURL } = await deploy({
    name, version, stage, entryFile: serverIndexFile, role, memorySize, timeout, environment, awsConfig
  });

  await fsp.remove(outputDir);

  return { apiURL };
}
