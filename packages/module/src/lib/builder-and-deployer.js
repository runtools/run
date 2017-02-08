'use strict';

import { buildClient } from './client-builder';
import { buildServer } from './server-builder';
import { deploy } from './deployer';

export async function buildAndDeploy({ inputDir, clientDir, serverDir, name, clientName, serverName, version, isPrivate, stage, role, memorySize, timeout, environment, awsConfig }) {
  await buildClient({
    inputDir, clientDir, name, clientName, version, isPrivate, stage
  });

  const { serverIndexFile } = await buildServer({
    inputDir, serverDir, name, serverName, version, stage
  });

  const { apiURL } = await deploy({
    name, version, stage, entryFile: serverIndexFile, role, memorySize, timeout, environment, awsConfig
  });

  return { apiURL };
}
