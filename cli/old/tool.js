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
    const tool = {...toolDef};
    tool.hooks = toolRef.hooks;
    tool.config = toolDef.config.merge(toolRef.config);
    return new this(tool);
  }

  static async createMany(toolRefs) {
    const tools = [];
    for (const toolRef of toolRefs) {
      const tool = await this.create(toolRef);
      tools.push(tool);
    }
    return tools;
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }
}

export default Tool;
