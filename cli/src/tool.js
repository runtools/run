import {defaultsDeep} from 'lodash';
import {avoidCommonMistakes} from 'run-common';

import Resource from './resource';
import Executable from './executable';
import Config from './config';
import Engine from './engine';

export class Tool extends Resource {
  static async create(file, definition, {resource, context} = {}) {
    if (!resource) {
      resource = await Resource.create(file, definition, {context});
    }

    context = this.extendContext(context, resource);

    avoidCommonMistakes(definition, {configs: 'config', engines: 'engine'}, {context});

    const tool = new this({
      ...resource,
      config: Config.normalize(definition.config || {}, context),
      engine: definition.engine && Engine.create(definition.engine, context)
    });

    await Executable.assign(tool, definition, context);

    return tool;
  }

  canRun(expression) {
    const cmdName = expression.getCommandName();
    return !cmdName || Boolean(this.findCommand(cmdName)) || Boolean(this.findGroup(cmdName));
  }

  getConfig() {
    return this.reduce(
      (config, tool) => {
        defaultsDeep(config, tool.config);
        return config;
      },
      {}
    );
  }
}

Executable.extend(Tool);

export default Tool;
