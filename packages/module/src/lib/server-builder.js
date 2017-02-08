'use strict';

import { join, relative } from 'path';
import fsp from 'fs-promise';
import { exec } from 'child-process-promise';
import { task, formatMessage } from '@voila/common';

const VOILA_MODULE_SERVER_VERSION = '^0.1.10';

export async function buildServer({ inputDir, serverDir, name, serverName, version, stage }) {
  let msg;

  const serverIndexFile = join(serverDir, 'index.js');

  msg = formatMessage({ name: serverName, stage, message: 'Generating files' });
  await task(msg, async () => {
    // package.json
    const serverPkgFile = join(serverDir, 'package.json');
    const serverPkg = {
      name: serverName,
      moduleName: name,
      version,
      private: true,
      files: ['index.js'],
      dependencies: {
        '@voila/module-server': VOILA_MODULE_SERVER_VERSION
      }
    };
    await fsp.outputFile(serverPkgFile, JSON.stringify(serverPkg, undefined, 2));

    // index.js
    const code = `"use strict";

var server = require("@voila/module-server");
var target = require(${JSON.stringify(relative(serverDir, inputDir))});

exports.handler = server.createHandler(target);\n`;

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

  return { serverIndexFile };
}
