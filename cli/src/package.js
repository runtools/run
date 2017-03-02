import pick from 'lodash.pick';

import Executable from './executable';
import Tool from './tool';

export class Package extends Executable {
  constructor(pkg) {
    super();
    Object.assign(this, pkg);
  }

  static async create(pkgDef) {
    let pkg = pick(pkgDef, [
      'name',
      'version',
      'description',
      'author',
      'private',
      'license',
      'repository',
      'commands',
      'config',
      'packageDir'
    ]);
    pkg.tools = await Tool.createMany(pkgDef.toolRefs);
    pkg = new this(pkg);
    return pkg;
  }
}

export default Package;
