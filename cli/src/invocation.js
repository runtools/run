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

  static create(array) {
    // 'cook pizza --salami' => {name: 'cook', arguments: ['pizza'], config: {salami: true}}

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

    invocation = {name, arguments: args, config};

    return new this(invocation);
  }

  static createMany(arrays) {
    if (!arrays) {
      throw new Error("'arrays' property is missing");
    }

    if (typeof arrays === 'string') {
      const str = arrays;
      return [this.create(str)];
    }

    if (Array.isArray(arrays)) {
      return arrays.map(obj => this.create(obj));
    }

    throw new Error("'arrays' property should be a string or an array");
  }
}

export default Invocation;
