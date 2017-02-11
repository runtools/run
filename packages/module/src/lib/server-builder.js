'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { task, formatMessage } from '@voila/common';
import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import { zipFiles } from './archiver';

export async function buildServer({ entryFile, name, stage }) {
  const msg = formatMessage({ name, stage, message: 'Building server bundle' });
  const { archive, rollupWarnings } = await task(msg, async () => {
    // *** bundle ***

    const rollupWarnings = [];
    const envPreset = require.resolve('babel-preset-env');

    const bundle = await rollup({
      entry: entryFile,
      plugins: [
        babel({
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
        }),
        nodeResolve(),
        commonjs(),
        json()
      ],
      onwarn(warning) { rollupWarnings.push(warning); }
    });

    const result = bundle.generate({
      format: 'cjs',
      exports: 'named'
    });
    const bundleCode = result.code;

    // *** module-server ***

    const moduleServerFile = join(__dirname, '..', 'assets', 'module-server.js');
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

    return { archive, rollupWarnings };
  });

  return { archive, rollupWarnings };
}
