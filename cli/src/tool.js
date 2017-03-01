import pick from 'lodash.pick';
import semver from 'semver';

import Package from './package';
import Command from './command';
import Hook from './hook';

export class Tool {
  constructor(tool) {
    Object.assign(this, tool);
  }

  merge(other) {
    this.commands = [...this.commands, ...other.commands];

    this.hooks = [...this.hooks, ...other.hooks];

    // TODO: merge config
  }

  static normalize(tool) {
    if (!tool) {
      throw new Error("'tool' parameter is missing");
    }

    if (!tool.name) {
      throw new Error("'name' property is missing in a tool");
    }

    const normalizedTool = pick(tool, ['name', 'defaultCommand']);

    normalizedTool.version = Tool.normalizeVersion(tool.version);
    normalizedTool.aliases = Tool.normalizeAliases(tool.aliases);
    normalizedTool.commands = Tool.normalizeCommands(tool.commands);
    normalizedTool.hooks = Tool.normalizeHooks(tool.hooks);
    normalizedTool.config = Package.normalizeConfig(tool.config);

    return normalizedTool;
  }

  static normalizeVersion(version) {
    // falsy value => 'latest'
    // 'beta' => 'beta'
    // '2.0.2' => '2.0.2'
    // '^0.5.1' => '0.5.x'
    // '~1.0.3' => '1.1.x'
    // '^1.3.3-beta' => '1.x.x-beta'

    if (!version) {
      return 'latest';
    }

    if (/^[a-z]+$/i.test(version)) {
      return version; // Tag ('latest', 'beta',...)
    }

    const strictVersion = semver.clean(version);
    if (strictVersion) {
      return strictVersion; // Strict version ('0.3.2', '2.3.1-beta',...)
    }

    if (/^[a-z]+$/i.test(version)) {
      return version; // Tag ('latest', 'beta',...)
    }

    const range = semver.validRange(version); // Return something like '>=1.3.3 <2.0.0'...
    if (!range) {
      throw new Error(`Version range '${version}' is invalid`);
    }

    if (/^[0-9a-z.-]+$/i.test(version)) {
      return version; // Should be something like '0.2.x' or '1.x.x-beta'
    }

    let type;
    if (version.startsWith('^')) {
      type = 'caret';
    } else if (version.startsWith('~')) {
      type = 'tilde';
    } else {
      throw new Error(
        `Version range '${version}' is not supported. Use caret, tilde or 1.x.x range types.`
      );
    }

    version = range.split(' ')[0].slice(2);
    // Let's find out the minimum compatible version:
    // For caret: 1.7.8 => 1.0.0 but 0.5.9 => 0.5.0
    // For tilde: 1.7.8 => 1.7.0 and 0.5.9 => 0.5.0
    const pre = semver.prerelease(version);
    const major = semver.major(version);
    if (type === 'caret' && major >= 1) {
      version = `${major}.x.x`;
    } else {
      const minor = semver.minor(version);
      version = `${major}.${minor}.x`;
    }
    if (pre) {
      version += '-' + pre.join('.');
    }

    return version;
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

  static normalizeCommands(commands) {
    if (!commands) {
      return [];
    }

    if (!Array.isArray(commands)) {
      const normalizedCommands = [];

      for (const name of Object.keys(commands)) {
        let command = commands[name];
        if (typeof command === 'string') {
          command = {target: command};
        }
        command.name = name;
        command = new Command(Command.normalize(command));
        normalizedCommands.push(command);
      }

      return normalizedCommands;
    }

    return commands.map(command => new Command(Command.normalize(command)));
  }

  static normalizeHooks(hooks) {
    if (!hooks) {
      return [];
    }

    if (!Array.isArray(hooks)) {
      const normalizedHooks = [];

      for (const name of Object.keys(hooks)) {
        let hook = hooks[name];
        if (typeof hook === 'string') {
          hook = {target: hook};
        }
        hook.name = name;
        hook = new Hook(Hook.normalize(hook));
        normalizedHooks.push(hook);
      }

      return normalizedHooks;
    }

    return hooks.map(hook => new Hook(Hook.normalize(hook)));
  }
}

export default Tool;
