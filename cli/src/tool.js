import pick from 'lodash.pick';

import Executable from './executable';

export class Tool extends Executable {
  constructor(toolDef, toolRef) {
    super();
    Object.assign(this, pick(toolDef, ['name', 'version', 'aliases', 'commands', 'packageDir']));
    this.hooks = toolRef.hooks;
    this.config = toolDef.config.merge(toolRef.config);
  }
}

export default Tool;
