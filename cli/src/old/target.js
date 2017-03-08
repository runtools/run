import {isAbsolute} from 'path';
import compact from 'lodash.compact';
import omit from 'lodash.omit';
import minimist from 'minimist';

import Config from './config';

export class Target {
  constructor(normalizedTarget) {
    Object.assign(this, normalizedTarget);
  }

  static normalize(target) {
    // 'cook pizza --salami' => {name: 'cook', arguments: ['pizza'], config: {salami: true}}

    if (!target) {
      throw new Error("'target' property is missing");
    }

    let normalizedTarget = target;

    if (typeof normalizedTarget === 'string') {
      // TODO: improve string parsing
      // Ex.: 'cook "buena pizza"' should not produce ['cook', '"buena', 'pizza"']
      normalizedTarget = compact(normalizedTarget.split(' '));
    }

    if (!Array.isArray(normalizedTarget)) {
      throw new Error("'target' property should be a string or an array");
    }

    normalizedTarget = minimist(normalizedTarget);
    const config = Config.normalize(omit(normalizedTarget, '_'));
    const args = normalizedTarget._;
    const name = args.shift();

    normalizedTarget = {name, arguments: args, config};

    return new this(normalizedTarget);
  }

  static normalizeMany(targets) {
    if (!targets) {
      throw new Error("'targets' property is missing");
    }

    if (typeof targets === 'string') {
      return [this.normalize(targets)];
    }

    if (Array.isArray(targets)) {
      return targets.map(this.normalize, this);
    }

    throw new Error("'targets' property should be a string or an array");
  }

  resolve({context, config}) {
    config = config.merge(this.config);

    // It the target a file?
    if (this.name.startsWith('.') || isAbsolute(this.name)) {
      return {context, name: this.name, arguments: this.arguments, config};
    }

    // The target should be another command
    for (const command of context.commands) {
      if (command.isMatching(this.name)) {
        return command.resolveTargets({context, config});
      }
    }

    for (const tool of context.tools) {
      if (tool.isMatching(this.name)) {
      }
    }
  }
}

export default Target;
