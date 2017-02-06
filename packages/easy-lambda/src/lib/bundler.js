'use strict';

import browserify from 'browserify';

export function bundle({ inputFile }) {
  const bundler = browserify({
    entries: [inputFile],
    standalone: 'bundle',
    browserField: false,
    builtins: false,
    commondir: false,
    ignoreMissing: true,
    detectGlobals: true,
    insertGlobalVars: { // https://github.com/substack/node-browserify/issues/1472
      process: undefined,
      global: undefined,
      'Buffer.isBuffer': undefined,
      Buffer: undefined
    }
  });

  return new Promise((resolve, reject) => {
    bundler.bundle(async (error, buff) => {
      if (error) {
        reject(error);
      } else {
        resolve(buff);
      }
    });
  });
}
