'use strict';

import { join, relative } from 'path';
import fsp from 'fs-promise';
import { exec } from 'child-process-promise';
import { task, formatMessage } from 'remotify-common';

const REMOTIFY_SERVER_VERSION = '^0.1.10';

export async function buildServer({ inputDir, outputDir, name, version, stage }) {
  let msg;

  const serverName = name + '-server';
  const serverDir = join(outputDir, serverName);
  const serverIndexFile = join(serverDir, 'index.js');

  msg = formatMessage({ name: serverName, stage, message: 'Generating files' });
  await task(msg, async () => {
    // package.json
    const serverPkgFile = join(serverDir, 'package.json');
    const serverPkg = {
      name: serverName,
      serviceName: name,
      version,
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

  msg = formatMessage({ name: serverName, stage, message: 'Installing dependencies' });
  await task(msg, async () => {
    await exec('npm install', { cwd: serverDir });
  });

  return { serverDir, serverIndexFile };
}
