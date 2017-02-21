'use strict';

import { existsSync } from 'fs';
import { join } from 'path';
import { writeFile } from 'fs-promise';
import { getPackage, putPackage, formatMessage, formatPath } from '@voila/common';

const INDEX = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Hello, World!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="shortcut icon" href="favicon.ico">
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
`;

const FAVICON = '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';

export async function initialize({ pkgDir }) {
  const pkg = getPackage(pkgDir);

  if (!pkg.voila) {
    pkg.voila = { type: require('../../package.json').name };
  }

  if (!pkg.main) {
    pkg.main = 'index.html';
    const mainFile = join(pkgDir, pkg.main);
    if (!existsSync(mainFile)) {
      await writeFile(mainFile, INDEX);
      console.log(formatMessage(
        `${formatPath(pkg.main)} created`, { status: 'success' }
      ));
      const favicon = 'favicon.ico';
      const faviconFile = join(pkgDir, favicon);
      if (!existsSync(faviconFile)) {
        await writeFile(faviconFile, FAVICON, { encoding: 'base64' });
        console.log(formatMessage(
          `${formatPath(favicon)} created`, { status: 'success' }
        ));
      }
    }
  }

  putPackage(pkgDir, pkg);
}
