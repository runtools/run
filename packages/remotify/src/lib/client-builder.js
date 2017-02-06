'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { exec } from 'child-process-promise';
import task from './task';

const REMOTIFY_CLIENT_VERSION = '^0.1.4';

export async function buildClient({ inputDir, outputDir, apiURL }) {
  const pkg = require(join(inputDir, 'package.json'));
  const clientName = pkg.name + '-client';
  const clientDir = join(outputDir, clientName);

  await task(`${clientName}: Generating files`, async () => {
    // package.json
    const clientPkgFile = join(clientDir, 'package.json');
    const clientPkg = {
      name: clientName,
      serviceName: pkg.name,
      version: pkg.version,
      files: ['index.js'],
      dependencies: {
        'remotify-client': REMOTIFY_CLIENT_VERSION
      }
    };
    await fsp.outputFile(clientPkgFile, JSON.stringify(clientPkg, undefined, 2));

    // index.js
    const clientIndexFile = join(clientDir, 'index.js');
    let code = `"use strict";

var client = require("remotify-client")({
  url: ${JSON.stringify(apiURL)}
});\n\n`;

    const service = require(inputDir);
    for (let key of Object.keys(service)) {
      if (key === '__esModule') continue;
      let value = service[key];
      key = JSON.stringify(key);
      if (typeof value === 'function') {
        value = `client.createFunction(${key})`;
      } else {
        value = JSON.stringify(value);
      }
      code += `exports[${key}] = ${value};\n`;
    }

    await fsp.outputFile(clientIndexFile, code);

    // .gitignore
    const clientGitIgnoreFile = join(clientDir, '.gitignore');
    const gitIgnore = '.DS_Store\nnode_modules\nnpm-debug.log\n';
    await fsp.outputFile(clientGitIgnoreFile, gitIgnore);
  });

  await task(`${clientName}: Installing dependencies`, async () => {
    await exec('npm install', { cwd: clientDir });
  });
}
