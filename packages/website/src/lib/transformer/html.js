'use strict';

import { relative, dirname } from 'path';
import { parse as parseURL, resolve as resolveURL, format as formatURL } from 'url';
import cheerio from 'cheerio';
import { readFile, writeFile, transformFile } from './file';

const TAGS_WITH_URL_ATTRIBUTES = {
  // Source: http://stackoverflow.com/a/2725168/7568015
  'a': ['href'],
  'applet': ['codebase'],
  'area': ['href'],
  'audio': ['src'],
  'base': ['href'],
  'body': ['background'],
  'button': ['formaction'],
  'command': ['icon'],
  'embed': ['src'],
  'del': ['cite'],
  'form': ['action'],
  'frame': ['src', 'longdesc'],
  'head': ['profile'],
  'html': ['manifest'],
  'iframe': ['src', 'longdesc'],
  'img': ['src', 'usemap', 'longdesc'],
  'input': ['src', 'usemap', 'formaction'],
  'ins': ['cite'],
  'link': ['href'],
  'object': ['classid', 'codebase', 'data', 'usemap'],
  'script': ['src'],
  'source': ['src'],
  'video': ['src', 'poster']
};

export async function transformHTML(opts) {
  // TODO:
  // - Analyse URLs inside inline styles:
  //   <div style="background: url(image.png)">
  // - And not easy parsing:
  //   <img srcset="url1 resolution1 url2 resolution2">
  //   <source srcset="url1 resolution1 url2 resolution2">
  //   <object archive=url> or <object archive="url1 url2 url3">
  //   <applet archive=url> or <applet archive=url1,url2,url3>
  //   <meta http-equiv="refresh" content="seconds; url">

  const content = await readFile(opts);

  const $ = cheerio.load(content);

  const selector = Object.keys(TAGS_WITH_URL_ATTRIBUTES).join(',');
  for (const element of $(selector).toArray()) {
    const urlAttributes = TAGS_WITH_URL_ATTRIBUTES[element.name];
    for (const urlAttribute of urlAttributes) {
      const url = $(element).attr(urlAttribute);
      if (!url) continue;

      const parsedURL = parseURL(url);
      if (parsedURL.protcol) continue; // Ignore absolute URLs

      const linkedFile = resolveURL(opts.file, parsedURL.pathname);

      const { newFile } = await transformFile({
        ...opts, file: linkedFile, referrer: opts.file
      });

      if (newFile && newFile !== linkedFile) { // The name of the file has changed
        parsedURL.pathname = relative(dirname(opts.file), newFile);
        const newURL = formatURL(parsedURL);
        $(element).attr(urlAttribute, newURL);
      }
    }
  }

  return await writeFile({ ...opts, hash: false }, $.html());
}
