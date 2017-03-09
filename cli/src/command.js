import entries from 'lodash.topairs';

import Invocation from './invocation';
import Alias from './alias';
import Config from './config';

export class Command {
  constructor(cmd) {
    Object.assign(this, cmd);
  }

  static create(obj, defaultName) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj === 'string' || Array.isArray(obj)) {
      obj = {invoke: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throw new Error("Command 'name' property is missing");
    }

    const cmd = {
      name,
      invocations: Invocation.createMany(obj.invoke || obj.invokes),
      aliases: Alias.createMany(obj.aliases || obj.alias),
      arguments: this.normalizeArguments(obj.arguments || obj.argument),
      config: Config.create(obj.config)
    };

    return new this(cmd);
  }

  static createMany(objs = []) {
    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj));
    }

    return entries(objs).map(([name, obj]) => this.create(obj, name));
  }

  static normalizeArguments(args = []) {
    return args; // TODO: more normalizations
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(tool, invocation) {
    for (let commandInvocation of this.invocations) {
      const config = this.config.merge(commandInvocation.config.merge(invocation.config));
      invocation = new Invocation({...commandInvocation, config});
      await tool.run(invocation);
    }
  }

  // resolveInvocations({context, config}) {
  //   config = config.merge(this.config);
  //   return this.invocations.map(invocation => invocation.resolve({context, config}));
  // }
}

export default Command;
