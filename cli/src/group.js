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

    const executable = await Executable.create(definition, {entity: group, context});
    Object.assign(group, executable);

    return group;
  }

  static extendContext(base, group) {
    return {...base, group: group.name};
  }
}

Executable.extend(Group);

export default Group;
