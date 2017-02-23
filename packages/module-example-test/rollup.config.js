import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import globals from 'rollup-plugin-node-globals';

export default {
  entry: 'src/index.js',
  dest: 'dist/index.js',
  format: 'iife',
  moduleName: 'bundle',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      presets: [
        [
          'env',
          {
            targets: {
              ie: 10,
              node: 4
            },
            loose: true,
            modules: false,
            useBuiltIns: true
          }
        ]
      ]
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    globals()
  ]
};
