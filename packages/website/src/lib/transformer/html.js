'use strict';

import { parse as parseURL, resolve as resolveURL } from 'url';
import cheerio from 'cheerio';
import { transformFile } from './file';

const TAGS_WITH_URL_ATTRIBUTES = {
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

export async function transformHTML({ content, ...opts }) {
  // TODO:
  // - Analyse URLs inside inline styles:
  //   <div style="background: url(image.png)">
  // - And not easy parsing:
  //   <img srcset="url1 resolution1 url2 resolution2">
  //   <source srcset="url1 resolution1 url2 resolution2">
  //   <object archive=url> or <object archive="url1 url2 url3">
  //   <applet archive=url> or <applet archive=url1,url2,url3>
  //   <meta http-equiv="refresh" content="seconds; url">

  const $ = cheerio.load(content);

  const files = [];
  const selector = Object.keys(TAGS_WITH_URL_ATTRIBUTES).join(',');
  $(selector).each((index, element) => {
    const urlAttributes = TAGS_WITH_URL_ATTRIBUTES[element.name];
    for (const urlAttribute of urlAttributes) {
      let url = $(element).attr(urlAttribute);
      if (!url) continue;
      url = parseURL(url);
      if (url.protcol) continue; // Ignore absolute URLs
      url = url.pathname;
      url = resolveURL(opts.file, url);
      files.push(transformFile({ ...opts, file: url, referrer: opts.file }));
    }
  });
  await Promise.all(files);

  return content;
}
