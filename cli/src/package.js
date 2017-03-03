import Executable from './executable';
import Tool from './tool';

export class Package extends Executable {
  constructor(pkg) {
    super();
    Object.assign(this, pkg);
  }

  static async create(pkgDef) {
    const pkg = {...pkgDef};
    pkg.tools = await Tool.createMany(pkgDef.toolRefs);
    return new this(pkg);
  }
}

export default Package;
