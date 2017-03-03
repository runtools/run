import entries from 'lodash.topairs';

import Target from './target';
import Alias from './alias';
import Config from './config';

export class Command {
  constructor(normalizedCommand) {
    Object.assign(this, normalizedCommand);
  }

  static normalize(command, defaultName) {
    if (!command) {
      throw new Error("'command' parameter is missing");
    }

    if (typeof command === 'string' || Array.isArray(command)) {
      command = {targets: command};
    }

    if (!command.name) {
      if (defaultName) {
        command.name = defaultName;
      } else {
        throw new Error("Command 'name' property is missing");
      }
    }

    const normalizedCommand = {
      name: command.name,
      targets: Target.normalizeMany(command.targets || command.target),
      aliases: Alias.normalizeMany(command.aliases || command.alias),
      arguments: this.normalizeArguments(command.arguments),
      config: Config.normalize(command.config)
    };

    return new this(normalizedCommand);
  }

  static normalizeMany(commands = []) {
    if (Array.isArray(commands)) {
      return commands.map(this.normalize, this);
    }
    return entries(commands).map(([name, command]) => this.normalize(command, name));
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  resolveTargets({context, config}) {
    config = config.merge(this.config);
    return this.targets.map(target => target.resolve({context, config}));
  }

  static normalizeArguments(args = []) {
    return args; // TODO: more normalizations
  }
}

export default Command;
