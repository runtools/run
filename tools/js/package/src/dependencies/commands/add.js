import {formatString, task} from 'run-common';

import JSPackage from '../..';
import Dependency from '../../dependency';

export default (async function(args, config, context) {
  // TODO: The resource should come from the engine
  const resource = await JSPackage.load(context.userResource);
  return add.call(resource, args, config, context);
});

async function add([packages], {peer, optional, dev, debug}, context) {
  let type;
  if (peer) {
    type = 'peer';
  } else if (optional) {
    type = 'optional';
  } else if (dev) {
    type = 'development';
  } else {
    type = 'regular';
  }

  for (const pkg of packages) {
    const {name} = Dependency.parsePackageProperty(pkg);
    await task(
      async () => {
        await this.addDependency({package: pkg, type}, {context});
        await this.updateDependencies({debug, context});
        await this.save({context});
      },
      {
        intro: `Adding ${formatString(name)} dependency...`,
        outro: `Dependency ${formatString(name)} added`,
        debug
      }
    );
  }
}
