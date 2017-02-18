'use strict';

import { readFile, writeFile } from './file';

export async function transformCSS(opts) {
  const content = await readFile(opts);

  // TODO: Analyse URLs inside styles to discover new linked files

  return await writeFile(opts, content);
}
