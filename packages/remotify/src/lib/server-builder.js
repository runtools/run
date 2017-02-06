'use strict';

import { join, relative } from 'path';
import fsp from 'fs-promise';
import { exec } from 'child-process-promise';
import task from './task';

const REMOTIFY_SERVER_VERSION = '^0.1.10';

export async function buildServer({ inputDir, outputDir }) {
  const pkg = require(join(inputDir, 'package.json'));
  const serverName = pkg.name + '-server';
  const serverDir = join(outputDir, serverName);
  const serverIndexFile = join(serverDir, 'index.js');

  await task(`${serverName}: Generating files`, async () => {
    // package.json
    const serverPkgFile = join(serverDir, 'package.json');
    const serverPkg = {
      name: serverName,
      serviceName: pkg.name,
      version: pkg.version,
      private: true,
      files: ['index.js'],
      dependencies: {
        'remotify-server': REMOTIFY_SERVER_VERSION
      }
    };
    await fsp.outputFile(serverPkgFile, JSON.stringify(serverPkg, undefined, 2));

    // index.js
    const code = `"use strict";

var server = require("remotify-server");
var service = require(${JSON.stringify(relative(serverDir, inputDir))});

exports.handler = server.createHandler(service);\n`;

    await fsp.outputFile(serverIndexFile, code);

    // .gitignore
    const serverGitIgnoreFile = join(serverDir, '.gitignore');
    const gitIgnore = '.DS_Store\nnode_modules\nnpm-debug.log\n';
    await fsp.outputFile(serverGitIgnoreFile, gitIgnore);
  });

  await task(`${serverName}: Installing dependencies`, async () => {
    await exec('npm install', { cwd: serverDir });
  });

  return { serverDir, serverIndexFile };
}
