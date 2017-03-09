// import {isAbsolute} from 'path';
import {resolve, relative, isAbsolute} from 'path';
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

  static create(dir, array) {
    // 'cook pizza --salami' => {dir, name: 'cook', arguments: ['pizza'], config: {salami: true}}

    if (!dir) {
      throw new Error("'dir' property is missing");
    }

    if (!array) {
      throw new Error("'array' property is missing");
    }

    let invocation = array;

    if (typeof invocation === 'string') {
      invocation = parse(invocation);
    }

    if (!Array.isArray(invocation)) {
      throw new Error("'array' property should be a string or an array");
    }

    invocation = minimist(invocation);

    const rawConfig = omit(invocation, '_');
    let config = {};
    for (const [key, value] of entries(rawConfig)) {
      config[camelCase(key)] = value;
    }
    config = Config.create(config);
    const args = invocation._;
    const name = args.shift();

    invocation = {dir, name, arguments: args, config};

    return new this(invocation);
  }

  static createMany(dir, arrays) {
    if (!dir) {
      throw new Error("'dir' property is missing");
    }

    if (!arrays) {
      throw new Error("'arrays' property is missing");
    }

    if (typeof arrays === 'string') {
      const str = arrays;
      return [this.create(dir, str)];
    }

    if (Array.isArray(arrays)) {
      return arrays.map(obj => this.create(dir, obj));
    }

    throw new Error("'arrays' property should be a string or an array");
  }

  merge(other) {
    const config = this.config.merge(other.config);
    return new this.constructor({...this, config});
  }

  getFile(baseDir) {
    let file = this.name;
    if (!isAbsolute(file)) {
      file = resolve(this.dir, file);
      file = relative(baseDir, file);
    }
    return file;
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
