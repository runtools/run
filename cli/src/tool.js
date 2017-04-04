import Resource from './resource';
import Executable from './executable';

export class Tool extends Resource {
  static async create(definition, {resource, source, file, context} = {}) {
    if (!resource) {
      resource = await Resource.create(definition, {source, file, context});
    }

    const tool = new this({...resource});

    context = this.extendContext(context, tool);

    const executable = await Executable.create(definition, {entity: tool, context});
    Object.assign(tool, executable);

    return tool;
  }

  static extendContext(base, tool) {
    return {...base, tool: tool.__file__};
  }
}

Executable.extend(Tool);

export default Tool;
