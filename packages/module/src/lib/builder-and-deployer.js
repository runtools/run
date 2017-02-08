'use strict';

import fsp from 'fs-promise';
import { buildClient } from './client-builder';
import { buildServer } from './server-builder';
import { deploy } from './deployer';

export async function buildAndDeploy({ inputDir, clientDir, serverDir, name, version, isPrivate, stage, role, memorySize, timeout, environment, awsConfig }) {
  await buildClient({
    inputDir, clientDir, name, version, isPrivate, stage
  });

  const { serverIndexFile, temporaryServerDir } = await buildServer({
    inputDir, serverDir, name, version, stage
  });

  const apiURL = await deploy({
    name, version, stage, entryFile: serverIndexFile, role, memorySize, timeout, environment, awsConfig
  });

  if (temporaryServerDir) await fsp.remove(temporaryServerDir);

  return apiURL;
}
