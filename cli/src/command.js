import {resolve, isAbsolute} from 'path';
import {entries, defaults, cloneDeep, defaultsDeep} from 'lodash';
import {createUserError, checkMistakes, formatPath, formatCode} from 'run-common';

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
      obj = {run: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throw createUserError(`Command ${formatCode('name')} property is missing`);
    }

    if (!(obj.file || obj.run)) {
      throw createUserError(
        `Command ${formatCode('file')} or  ${formatCode('run')} property is missing`
      );
    }

    checkMistakes(obj, {alias: 'aliases', files: 'file', runs: 'run', argument: 'arguments'}, {
      file: formatPath(tool.toolFile),
      command: formatCode(name)
    });

    const cmd = new this({
      name,
      aliases: Alias.createMany(obj.aliases),
      file: obj.file,
      invocations: obj.run && Invocation.createMany(obj.run),
      arguments: Argument.createMany(obj.arguments),
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

    const config = cloneDeep(invocation.config);
    defaultsDeep(config, this.config.getDefaults(), this.tool.config.getDefaults());

    if (this.file) {
      const runtime = this.runtime || this.tool.runtime;
      const file = resolve(this.tool.toolDir, this.file);
      return await runtime.run({file, arguments: args, config});
    }

    let result;
    for (let cmdInvocation of this.invocations) {
      cmdInvocation = cmdInvocation.resolveVariables({arguments: args, config});
      result = this.tool.run(cmdInvocation);
    }
    return result;
  }
}

export default Command;
