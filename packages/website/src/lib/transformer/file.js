'use strict';

import { join, basename, extname } from 'path';
import { existsSync } from 'fs';
import fsp from 'fs-promise';
import { formatPath, generateHash, createUserError } from '@voila/common';
import { transformHTML } from './html';
import { transformCSS } from './css';
import { transformSVG } from './svg';
import { transformJS } from './js';

export async function transformFile({ transformations, ...opts }) {
  if (opts.file.startsWith('../')) {
    let info = `"${opts.file}"`;
    if (opts.referrer) info += ` (referred from "${opts.referrer}")`;
    throw createUserError('Cannot bundle a file located outside the base directory:', info);
  }

  let transformation;

  if (!transformations) transformations = [];
  transformation = transformations.find(item => item.oldFile === opts.file);
  if (transformation) return transformation;
  transformation = { oldFile: opts.file };
  transformations.push(transformation);

  if (!existsSync(join(opts.inputDir, opts.file))) {
    let info = `"${opts.file}"`;
    if (opts.referrer) info += ` (referred from "${opts.referrer}")`;
    throw createUserError('File not found:', info);
  }

  opts.currentTask.setMessage(`Bundling ${formatPath(opts.file)}...`);

  let result;

  const ext = extname(opts.file);
  if (ext === '.html' || ext === '.htm' || ext === '.xhtml') {
    result = await transformHTML({ ...opts, transformations });
  } else if (ext === '.css') {
    result = await transformCSS({ ...opts, transformations });
  } else if (ext === '.svg') {
    result = await transformSVG({ ...opts, transformations });
  } else if ((ext === '.js' || ext === '.jsx') && opts.bundle) {
    result = await transformJS({ ...opts, transformations });
  } else {
    const content = await readFile({ ...opts, encoding: null });
    const hash = opts.hash && basename(opts.file) !== 'favicon.ico';
    result = await writeFile({ ...opts, hash }, content);
  }

  transformation.newFile = result.newFile;

  return transformation;
}

export async function readFile({ inputDir, file, encoding }) {
  if (typeof encoding === 'undefined') encoding = 'utf8';
  return await fsp.readFile(join(inputDir, file), encoding);
}

export async function writeFile({ outputDir, file, hash }, content) {
  if (hash) {
    const contentHash = generateHash(content, 'sha1').substr(0, 8);
    const ext = extname(file);
    file = file.slice(0, -ext.length);
    file += '.' + contentHash + ext;
  }
  await fsp.outputFile(join(outputDir, file), content);
  return { newFile: file };
}
