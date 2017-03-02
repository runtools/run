import pick from 'lodash.pick';

import Aliases from './aliases';
import Config from './config';

export class Command {
  constructor(command) {
    Object.assign(this, pick(command, ['name', 'target', 'aliases', 'arguments', 'config']));
  }

  static normalize(command) {
    if (!command) {
      throw new Error("'command' parameter is missing");
    }
    if (typeof command.name !== 'string') {
      throw new Error("Command 'name' property must be a string");
    }
    if (!command.target) {
      throw new Error("Command 'target' property is missing");
    }

    let normalizedCommand = pick(command, ['name', 'target']);
    normalizedCommand.aliases = Aliases.normalize(command.aliases);
    normalizedCommand.arguments = this.normalizeArguments(command.arguments);
    normalizedCommand.config = Config.normalize(command.config);
    normalizedCommand = new this(normalizedCommand);
    return normalizedCommand;
  }

  static normalizeMany(commands, defaultCommand) {
    const normalizedCommands = [];

    if (!commands) {
      commands = {};
    }

    if (defaultCommand) {
      commands[''] = defaultCommand;
    }

    for (const name of Object.keys(commands)) {
      let command = commands[name];
      if (typeof command === 'string') {
        command = {target: command};
      }
      command.name = name;
      const normalizedCommand = this.normalize(command);
      normalizedCommands.push(normalizedCommand);
    }

    return normalizedCommands;
  }

  static normalizeArguments(args) {
    if (!args) {
      return [];
    }
    return args; // TODO: more normalizations
  }
}

export default Command;
