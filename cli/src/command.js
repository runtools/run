import entries from 'lodash.topairs';
import cloneDeep from 'lodash.clonedeep';
import defaults from 'lodash.defaults';

import Invocation from './invocation';
import Alias from './alias';
import Argument from './argument';
import Config from './config';

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

    if (typeof obj === 'string' || Array.isArray(obj)) {
      obj = {run: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throw new Error("Command 'name' property is missing");
    }

    const cmd = new this({
      name,
      aliases: Alias.createMany(obj.aliases || obj.alias),
      invocations: Invocation.createMany(obj.run || obj.runs),
      arguments: Argument.createMany(obj.arguments || obj.argument),
      config: Config.create(obj.config),
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

  resolveInvocation(invocation) {
    const defaultArgs = this.arguments.map(arg => arg.default);
    defaultArgs.unshift(undefined); // first argument is the command name
    const args = cloneDeep(invocation.arguments);
    defaults(args, defaultArgs);

    return this.invocations.map(cmdInvocation => {
      cmdInvocation = cmdInvocation.clone();
      cmdInvocation.resolveArguments(args);
      cmdInvocation.config.setDefaults(invocation.config, this.config, this.tool.config);
      cmdInvocation.runtime = this.runtime || this.tool.runtime;
      cmdInvocation.dir = this.tool.toolDir;
      return this.tool.resolveInvocation(cmdInvocation);
    });
  }
}

export default Command;
