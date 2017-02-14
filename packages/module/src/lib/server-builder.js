'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { task, formatMessage } from '@voila/common';
import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import bytes from 'bytes';
import { zipFiles } from './archiver';

export async function buildServer({ entryFile, name, stage, bundle, transpile }) {
  const message = formatMessage({ name, stage, message: 'Generating server bundle...' });
  return await task(message, async (currentTask) => {
    // *** bundle ***

    const rollupWarnings = [];

    let bundleCode;
    if (bundle) {
      const config = {
        entry: entryFile,
        plugins: [
          nodeResolve(),
          commonjs(),
          json()
        ],
        onwarn(warning) { rollupWarnings.push(warning); }
      };

      if (transpile) {
        const envPreset = require.resolve('babel-preset-env');
        config.plugins.push(babel({
          exclude: 'node_modules/**',
          presets: [
            [
              envPreset,
              {
                targets: { node: 4 },
                loose: true,
                modules: false,
                exclude: ['transform-regenerator']
              }
            ]
          ]
        }));
      }

      const result = (await rollup(config)).generate({
        format: 'cjs',
        exports: 'named'
      });

      bundleCode = result.code;
    } else {
      bundleCode = await fsp.readFile(entryFile);
    }

    // *** module-server ***

    const moduleServerFile = join(__dirname, '..', 'vendor', 'module-server.js');
    const moduleServerCode = await fsp.readFile(moduleServerFile, 'utf8');

    // *** handler ***

    const handlerCode = `'use strict';\n
var moduleServer = require('./module-server');
var target = require('./bundle');\n
exports.handler = moduleServer.createHandler(target);\n`;

    // *** archive ***

    const archive = await zipFiles([
      { name: 'module-server.js', data: moduleServerCode },
      { name: 'bundle.js', data: bundleCode },
      { name: 'handler.js', data: handlerCode }
    ]);

    const info = bytes(archive.length);
    currentTask.setSuccessMessage(formatMessage({
      name, stage, message: 'Server bundle generated', info
    }));

    return { archive, rollupWarnings };
  });
}
