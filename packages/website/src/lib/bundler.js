'use strict';

import { join, extname } from 'path';
import { parse as parseURL, resolve as resolveURL } from 'url';
import { existsSync } from 'fs';
import { readFile, outputFile as writeFile } from 'fs-promise';
import cheerio from 'cheerio';
import { createUserError } from '@voila/common';

export async function bundle({ inputDir, outputDir, file, referrer, filesAlreadySeen }) {
  if (!filesAlreadySeen) filesAlreadySeen = [];
  if (filesAlreadySeen.includes(file)) return;
  filesAlreadySeen.push(file);

  const inputFile = join(inputDir, file);
  const outputFile = join(outputDir, file);

  if (!existsSync(inputFile)) {
    let info = `"${file}"`;
    if (referrer) info += ` (referred from "${referrer}")`;
    throw createUserError('File not found:', info);
  }

  console.log(`Bundling ${file}`);

  let content = await readFile(inputFile);

  const extension = extname(file);
  if (extension === '.html' || extension === '.htm' || extension === '.xhtml') {
    content = content.toString();
    content = await bundleHTML({
      inputDir, outputDir, file, content, filesAlreadySeen
    });
  }

  await writeFile(outputFile, content);
}

async function bundleHTML({ inputDir, outputDir, file, content, filesAlreadySeen }) {
  const $ = cheerio.load(content);

  const items = [];
  $('a').each((index, element) => {
    let url = $(element).attr('href');
    url = parseURL(url);
    if (url.protcol) return; // Ignore absolute URLs
    url = url.pathname;
    url = resolveURL(file, url);
    if (url.startsWith('../')) {
      throw createUserError('Cannot bundle a file located outside the input directory', `(input directory: "${inputDir}", file: "${url}")`);
    }
    items.push(bundle({
      inputDir, outputDir, file: url, referrer: file, filesAlreadySeen
    }));
  });
  await Promise.all(items);

  return content;
}
