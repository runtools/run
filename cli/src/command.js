import {resolve, isAbsolute} from 'path';
import {entries, defaults} from 'lodash';

import Invocation from './invocation';
import Alias from './alias';
import Argument from './argument';
import Config from './config';
import Runtime from './runtime';

export class Command {
  constructor(cmd) {
    Object.assign(this, cmd);
  }

  static create(tool, obj, defaultName) {
    if (!tool) {
      throw new Error("'tool' parameter is missing");
    }

    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('.') || isAbsolute(obj)) {
        obj = {file: obj};
      } else {
        obj = [obj];
      }
    }

    if (Array.isArray(obj)) {
      obj = {invocations: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throw new Error("Command 'name' property is missing");
    }

    const cmd = new this({
      name,
      aliases: Alias.createMany(obj.aliases || obj.alias),
      file: obj.file,
      invocations: Invocation.createMany(obj.invocations || obj.run || obj.runs),
      arguments: Argument.createMany(obj.arguments || obj.argument),
      config: Config.create(obj.config),
      runtime: obj.runtime && Runtime.create(obj.runtime),
      tool
    });

    return cmd;
  }

  static createMany(tool, objs = []) {
    if (!tool) {
      throw new Error("'tool' parameter is missing");
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(tool, obj));
    }

    return entries(objs).map(([name, obj]) => this.create(tool, obj, name));
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(invocation) {
    const defaultArgs = this.arguments.map(arg => arg.default);
    const [_, ...args] = invocation.arguments;
    defaults(args, defaultArgs);

    const config = invocation.config.clone();
    config.setDefaults(this.config, this.tool.config);

    if (this.file) {
      const runtime = this.runtime || this.tool.runtime;
      const file = resolve(this.tool.toolDir, this.file);
      return await runtime.run({file, arguments: args, config});
    }

    let result;
    for (let cmdInvocation of this.invocations) {
      cmdInvocation = cmdInvocation.clone();
      cmdInvocation.resolveVariables({arguments: args, config});
      result = this.tool.run(cmdInvocation);
    }
    return result;
  }
}

export default Command;
