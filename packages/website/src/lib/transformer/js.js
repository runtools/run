'use strict';

import { join } from 'path';
import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';

export async function transformJS({ content, ...opts }) {
  if (!opts.bundle) return content;

  const rollupWarnings = [];

  const config = {
    entry: join(opts.inputDir, opts.file),
    plugins: [
      nodeResolve({ browser: true }),
      commonjs(),
      json(),
      globals(),
      builtins()
    ],
    onwarn(warning) { rollupWarnings.push(warning); }
  };

  if (opts.transpile) {
    config.plugins.push(babel({
      exclude: '**/node_modules/**',
      presets: [
        [
          require.resolve('babel-preset-env'),
          {
            targets: { ie: 10, node: 4 },
            loose: true,
            modules: false
          }
        ]
      ],
      plugins: [
        require.resolve('babel-plugin-transform-object-rest-spread')
      ]
    }));
  }

  const result = (await rollup(config)).generate({
    format: 'iife',
    moduleName: 'bundle'
  });

  content = result.code;

  return content;
}
