'use strict';

import browserify from 'browserify';
import { task, formatMessage } from '@voila/common';
import { zip } from './archiver';

export async function bundle({ name, stage, serverIndexFile }) {
  const msg = formatMessage({ name, stage, message: 'Packaging server files' });
  return await task(msg, async () => {
    const bundler = browserify({
      entries: [serverIndexFile],
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

    let code = await new Promise((resolve, reject) => {
      bundler.bundle(async (error, buff) => {
        if (error) {
          reject(error);
        } else {
          resolve(buff);
        }
      });
    });

    code = await zip({ data: code, filename: 'handler.js' });

    return code;
  });
}
