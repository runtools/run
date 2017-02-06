'use strict';

import { join } from 'path';
import { deploy } from 'easy-lambda';
import { buildClient } from './client-builder';
import { buildServer } from './server-builder';

export async function buildAndDeploy({ inputDir, outputDir, role, awsConfig }) {
  const pkg = require(join(inputDir, 'package.json'));
  const name = pkg.name;

  const { serverIndexFile } = await buildServer({ inputDir, outputDir });

  const apiURL = await deploy({ name, entryFile: serverIndexFile, role, awsConfig });

  await buildClient({ inputDir, outputDir, apiURL });

  return name;
}
