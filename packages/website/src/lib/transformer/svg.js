'use strict';

import { readFile, writeFile } from './file';

export async function transformCSS(opts) {
  const content = await readFile(opts);

  // TODO: Analyse URLs inside SVG to discover new linked files
  // Ex.: <svg><image href="url" /></svg>

  return await writeFile(opts, content);
}
