import pick from 'lodash.pick';

import {createUserError} from '@high/shared';

import Aliases from './aliases';
import Command from './command';
import Config from './config';
import packageStore from './package-store';

export class ToolDefinition {
  constructor(toolDefinition) {
    Object.assign(this, pick(toolDefinition, ['name', 'version', 'aliases', 'commands', 'config']));
  }

  static async loadFromStore({name, version}) {
    const {packageDir, packageContent} = await packageStore.loadPackage({name, version});
    let toolDef = packageContent.tool;
    if (!toolDef) {
      throw createUserError(`${name}@${version} is not a tool`);
    }
    toolDef.name = packageContent.name;
    toolDef.version = packageContent.version;
    const normalizedToolDef = this.normalize(toolDef);
    normalizedToolDef.packageDir = packageDir;
    return normalizedToolDef;
  }

  static normalize(toolDef) {
    if (!toolDef) {
      throw new Error("'toolDef' parameter is missing");
    }

    let normalizedToolDef = {
      name: this.normalizeName(toolDef.name),
      version: this.normalizeVersion(toolDef.version),
      aliases: Aliases.normalize(toolDef.aliases),
      commands: Command.normalizeMany(toolDef.commands, toolDef.defaultCommand),
      config: Config.normalize(toolDef.config)
    };

    normalizedToolDef = new this(normalizedToolDef);

    return normalizedToolDef;
  }

  static normalizeName(name) {
    if (!name) {
      throw new Error('Tool definition name property is missing');
    }
    return name;
  }

  static normalizeVersion(version) {
    if (!version) {
      throw new Error('Tool definition version property is missing');
    }
    return version;
  }
}

export default ToolDefinition;
