import pick from 'lodash.pick';

import Executable from './executable';
import ToolDefinition from './tool-definition';

export class Tool extends Executable {
  constructor(tool) {
    super();
    Object.assign(this, tool);
  }

  static async create(toolRef) {
    const {name, version} = toolRef;
    const toolDef = await ToolDefinition.loadFromStore({name, version});
    let tool = pick(toolDef, ['name', 'version', 'aliases', 'commands', 'packageDir']);
    tool.hooks = toolRef.hooks;
    tool.config = toolDef.config.merge(toolRef.config);
    tool = new this(tool);
    return tool;
  }

  static async createMany(toolRefs) {
    const tools = [];
    for (const toolRef of toolRefs) {
      const tool = await this.create(toolRef);
      tools.push(tool);
    }
    return tools;
  }
}

export default Tool;
