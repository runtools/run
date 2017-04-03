import Resource from './resource';
import Executable from './executable';

export class Tool extends Resource {
  static async create(file, definition, {resource, context} = {}) {
    if (!resource) {
      resource = await Resource.create(file, definition, {context});
    }

    const tool = new this({...resource});

    context = this.extendContext(context, tool);

    const executable = await Executable.create(definition, {entity: tool, context});
    Object.assign(tool, executable);

    return tool;
  }

  static extendContext(base, tool) {
    return {...base, tool: tool.resourceFile};
  }
}

Executable.extend(Tool);

export default Tool;
