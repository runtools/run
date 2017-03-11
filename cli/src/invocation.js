import omit from 'lodash.omit';
import entries from 'lodash.topairs';
import camelCase from 'lodash.camelcase';
import cloneDeep from 'lodash.clonedeep';
import minimist from 'minimist';
import {parse} from 'shell-quote';

import Config from './config';

export class Invocation {
  constructor(invocation) {
    Object.assign(this, invocation);
  }

  static create(array, dir) {
    // 'cook pizza --salami' => {name: 'cook', arguments: ['pizza'], config: {salami: true}}

    if (!array) {
      throw new Error("'array' property is missing");
    }

    let invocation = array;

    if (typeof invocation === 'string') {
      invocation = parse(invocation, name => ({var: name}));
    }

    if (!Array.isArray(invocation)) {
      throw new Error("'array' property should be a string or an array");
    }

    invocation = minimist(invocation);

    const args = invocation._;

    const originalConfig = omit(invocation, '_');
    let config = {};
    for (const [key, value] of entries(originalConfig)) {
      config[camelCase(key)] = value;
    }
    config = Config.create(config);

    invocation = {arguments: args, config};

    if (dir) {
      invocation.dir = dir;
    }

    return new this(invocation);
  }

  static createMany(arrays, dir) {
    if (!arrays) {
      throw new Error("'arrays' property is missing");
    }

    if (typeof arrays === 'string') {
      const str = arrays;
      return [this.create(str, dir)];
    }

    if (Array.isArray(arrays)) {
      return arrays.map(obj => this.create(obj, dir));
    }

    throw new Error("'arrays' property should be a string or an array");
  }

  clone() {
    return new this.constructor({
      arguments: cloneDeep(this.arguments),
      config: this.config.clone(),
      dir: this.dir,
      runtime: this.runtime && this.runtime.clone()
    });
  }

  resolveArguments(callerArgs) {
    for (var i = 0; i < this.arguments.length; i++) {
      const arg = this.arguments[i];
      if (typeof arg === 'object' && 'var' in arg) {
        const name = arg.var;
        const position = Number(name);
        if (position.toString() === name) {
          // arg is a positional argument variable
          this.arguments[i] = callerArgs[position] || '';
        } else {
          // arg should be an environment variable
          this.arguments[i] = process.env[name] || '';
        }
      }
    }
  }
}

export default Invocation;
