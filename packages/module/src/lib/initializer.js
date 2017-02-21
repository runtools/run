'use strict';

import { existsSync } from 'fs';
import { join } from 'path';
import { writeFile } from 'fs-promise';
import { getPackage, putPackage, formatMessage, formatPath } from '@voila/common';

const DEFAULT_MAIN = `'use strict';

export async function hello() {
  return 'Hello, World!';
}
`;

export async function initialize({ pkgDir }) {
  const pkg = getPackage(pkgDir);

  if (!pkg.voila) {
    pkg.voila = { type: require('../../package.json').name };
  }

  if (!pkg.main) {
    pkg.main = 'index.js';
    const mainFile = join(pkgDir, pkg.main);
    if (!existsSync(mainFile)) {
      await writeFile(mainFile, DEFAULT_MAIN);
      console.log(formatMessage(
        `${formatPath(pkg.main)} created`, { status: 'success' }
      ));
    }
  }

  putPackage(pkgDir, pkg);
}
