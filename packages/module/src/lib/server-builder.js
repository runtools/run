'use strict';

import { join } from 'path';
import fsp from 'fs-promise';
import { task, formatMessage } from '@voila/common';
import { rollup } from 'rollup';
import { zipFiles } from './archiver';

export async function buildServer({ entryFile, name, stage }) {
  const msg = formatMessage({ name, stage, message: 'Building server bundle' });
  const archive = await task(msg, async () => {
    // bundle.js
    const bundle = await rollup({
      entry: entryFile
    });
    const result = bundle.generate({
      format: 'cjs'
    });
    const bundleCode = result.code;

    // module-server.js
    const moduleServerFile = join(__dirname, '..', 'assets', 'module-server.js');
    const moduleServerCode = await fsp.readFile(moduleServerFile, 'utf8');

    // handler.js
    const handlerCode = `'use strict';

var moduleServer = require('./module-server');
var target = require('./bundle');

exports.handler = moduleServer.createHandler(target);\n`;

    return await zipFiles([
      { name: 'module-server.js', data: moduleServerCode },
      { name: 'bundle.js', data: bundleCode },
      { name: 'handler.js', data: handlerCode }
    ]);
  });

  return { archive };
}
