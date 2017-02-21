'use strict';

import { cyan } from 'chalk';
import { getPackage, runPackageHandler, createUserError } from '@voila/common';

export async function forward({ pkgDir, args }) {
  const pkg = getPackage(pkgDir);

  const type = pkg.voila && pkg.voila.type;
  if (!type) {
    throw createUserError('Unknown package type!', `Please run ${cyan('`voila init <package-type>`')} at the root of your package to initialize it.`);
  }

  return await runPackageHandler({ pkgDir, type, args });
}
