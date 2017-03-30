import {defaultsDeep} from 'lodash';
import {avoidCommonMistakes} from 'run-common';

import Resource from './resource';
import Executable from './executable';
import Config from './config';
import Engine from './engine';

export class Tool extends Resource {
  static async create(baseResource, definition, {context} = {}) {
    if (!baseResource) {
      throw new Error("'baseResource' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    avoidCommonMistakes(definition, {configs: 'config', engines: 'engine'}, {context});

    const tool = new this({
      ...baseResource,
      config: Config.normalize(definition.config || {}, context),
      engine: definition.engine && Engine.create(definition.engine, context)
    });

    Executable.assign(tool, definition, context);

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
