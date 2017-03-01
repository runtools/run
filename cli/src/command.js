import pick from 'lodash.pick';

import Package from './package';

export class Command {
  constructor(command) {
    Object.assign(this, command);
  }

  static normalize(command) {
    if (!command) {
      throw new Error("'command' parameter is missing");
    }

    if (!command.name) {
      throw new Error("'name' property is missing in a command");
    }

    if (!command.target) {
      throw new Error("'target' property is missing in a command");
    }

    const normalizedCommand = pick(command, ['name', 'target']);

    normalizedCommand.aliases = Command.normalizeAliases(command.aliases);
    normalizedCommand.arguments = Command.normalizeArguments(command.arguments);
    normalizedCommand.config = Package.normalizeConfig(command.config);

    return normalizedCommand;
  }

  static normalizeAliases(aliases) {
    if (!aliases) {
      return [];
    }
    if (!Array.isArray(aliases)) {
      return [aliases];
    }
    return aliases;
  }

  static normalizeArguments(args) {
    if (!args) {
      return [];
    }
    return args; // TODO: more normalizations
  }
}

export default Command;
