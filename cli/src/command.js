import pick from 'lodash.pick';
import entries from 'lodash.topairs';

import Aliases from './aliases';
import Config from './config';

export class Command {
  constructor(normalizedCommand) {
    Object.assign(this, normalizedCommand);
  }

  static normalize(command, defaultName) {
    if (!command) {
      throw new Error("'command' parameter is missing");
    }

    if (typeof command === 'string') {
      command = {target: command};
    }

    if (!command.name) {
      if (defaultName) {
        command.name = defaultName;
      } else {
        throw new Error("Command 'name' property is missing");
      }
    }

    if (!command.target) {
      throw new Error("Command 'target' property is missing");
    }

    const normalizedCommand = pick(command, ['name', 'target']);
    normalizedCommand.aliases = Aliases.normalize(command.aliases);
    normalizedCommand.arguments = this.normalizeArguments(command.arguments);
    normalizedCommand.config = Config.normalize(command.config);
    return new this(normalizedCommand);
  }

  static normalizeMany(commands = []) {
    if (Array.isArray(commands)) {
      return commands.map(this.normalize, this);
    }
    return entries(commands).map(([name, command]) => this.normalize(command, name));
  }

  static normalizeArguments(args = []) {
    return args; // TODO: more normalizations
  }
}

export default Command;
