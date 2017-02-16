'use strict';

import { join, extname } from 'path';
import { existsSync } from 'fs';
import { readFile, outputFile as writeFile } from 'fs-promise';
import { yellow } from 'chalk';
import { createUserError } from '@voila/common';
import { transformHTML } from './html';
import { transformCSS } from './css';
import { transformSVG } from './svg';
import { transformJS } from './js';

export async function transformFile({ filesAlreadySeen, ...opts }) {
  if (opts.file.startsWith('../')) {
    let info = `"${opts.file}"`;
    if (opts.referrer) info += ` (referred from "${opts.referrer}")`;
    throw createUserError('Cannot bundle a file located outside the base directory:', info);
  }

  if (!filesAlreadySeen) filesAlreadySeen = [];
  if (filesAlreadySeen.includes(opts.file)) return;
  filesAlreadySeen.push(opts.file);

  const inputFile = join(opts.inputDir, opts.file);
  const outputFile = join(opts.outputDir, opts.file);

  if (!existsSync(inputFile)) {
    let info = `"${opts.file}"`;
    if (opts.referrer) info += ` (referred from "${opts.referrer}")`;
    throw createUserError('File not found:', info);
  }

  opts.currentTask.setMessage(`Bundling ${yellow(opts.file)}...`);

  let content = await readFile(inputFile);

  const ext = extname(opts.file);
  if (ext === '.html' || ext === '.htm' || ext === '.xhtml') {
    content = content.toString();
    content = await transformHTML({ ...opts, content, filesAlreadySeen });
  } else if (ext === '.css') {
    content = content.toString();
    content = await transformCSS({ ...opts, content, filesAlreadySeen });
  } else if (ext === '.svg') {
    content = content.toString();
    content = await transformSVG({ ...opts, content, filesAlreadySeen });
  } else if (ext === '.js' || ext === '.jsx') {
    content = content.toString();
    content = await transformJS({ ...opts, content, filesAlreadySeen });
  }

  await writeFile(outputFile, content);
}
