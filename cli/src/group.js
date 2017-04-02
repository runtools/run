import Entity from './entity';
import Executable from './executable';

export class Group extends Entity {
  static async create(definition, {parent, defaultName, context}) {
    if (!parent) {
      throw new Error("'parent' argument is missing");
    }

    const name = definition.name || defaultName;

    context = this.extendContext(context, {name});

    const group = await Entity.create.call(this, definition, {parent, defaultName, context});

    await Executable.assign(group, definition, context);

    return group;
  }

  static extendContext(base, obj) {
    return {...base, group: obj.name};
  }
}

Executable.extend(Group);

export default Group;
