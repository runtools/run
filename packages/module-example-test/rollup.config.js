import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import globals from 'rollup-plugin-node-globals';

export default {
  entry: 'es5/index.js',
  dest: 'dist/index.js',
  format: 'iife',
  moduleName: 'bundle',
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    globals()
  ]
};
