// import {isAbsolute} from 'path';
import omit from 'lodash.omit';
import entries from 'lodash.topairs';
import camelCase from 'lodash.camelcase';
import minimist from 'minimist';
import {parse} from 'shell-quote';

import Config from './config';

export class Invocation {
  constructor(invocation) {
    Object.assign(this, invocation);
  }

  static create(obj, cwd) {
    // 'cook pizza --salami' => {name: 'cook', arguments: ['pizza'], config: {salami: true}, cwd}

    if (!obj) {
      throw new Error("'obj' property is missing");
    }

    let invocation = obj;

    if (typeof invocation === 'string') {
      invocation = parse(invocation);
    }

    if (!Array.isArray(invocation)) {
      throw new Error("'obj' property should be a string or an array");
    }

    invocation = minimist(invocation);

    const rawConfig = Config.create(omit(invocation, '_'));
    const config = {};
    for (const [key, value] of entries(rawConfig)) {
      config[camelCase(key)] = value;
    }
    const args = invocation._;
    const name = args.shift();

    invocation = {name, arguments: args, config, cwd};

    return new this(invocation);
  }

  static createMany(objs, cwd) {
    if (!objs) {
      throw new Error("'objs' property is missing");
    }

    if (typeof objs === 'string') {
      const obj = objs;
      return [this.create(obj, cwd)];
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj, cwd));
    }

    throw new Error("'objs' property should be a string or an array");
  }

  // resolve({context, config}) {
  //   config = config.merge(this.config);
  //
  //   // It the target a file?
  //   if (this.name.startsWith('.') || isAbsolute(this.name)) {
  //     return {context, name: this.name, arguments: this.arguments, config};
  //   }
  //
  //   // The target should be another command
  //   for (const command of context.commands) {
  //     if (command.isMatching(this.name)) {
  //       return command.resolveInvocations({context, config});
  //     }
  //   }
  //
  //   for (const tool of context.tools) {
  //     if (tool.isMatching(this.name)) {
  //     }
  //   }
  // }
}

export default Invocation;
