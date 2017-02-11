import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  entry: 'dist/index.js',
  dest: '../module/src/assets/module-server.js',
  format: 'cjs',
  plugins: [
    nodeResolve(),
    commonjs()
  ]
};
