import Executable from './executable';
import Tool from './tool';
import Target from './target';

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

  runCommand(target) {
    const normalizedTarget = Target.normalize(target);
    console.log(normalizedTarget.resolve({context: this, config: this.config}));
    // console.dir(command.resolveTargets({context: this}), {depth: 10});
  }
}

export default Package;
