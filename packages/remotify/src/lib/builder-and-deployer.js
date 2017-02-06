'use strict';

import { deploy } from 'easy-lambda';
import { buildClient } from './client-builder';
import { buildServer } from './server-builder';

export async function buildAndDeploy({ inputDir, outputDir, name, version, stage, role, awsConfig }) {
  await buildClient({
    inputDir, outputDir, name, version, stage
  });

  const { serverIndexFile } = await buildServer({
    inputDir, outputDir, name, version, stage
  });

  const apiURL = await deploy({
    entryFile: serverIndexFile, name, stage, role, awsConfig
  });

  return apiURL;
}
