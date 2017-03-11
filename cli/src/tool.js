import {existsSync} from 'fs';
import {join, dirname, basename, isAbsolute, resolve} from 'path';

import {readFile, writeFile, createUserError, formatPath, formatCode} from '@high/shared';

import Version from './version';
import Command from './command';
import Config from './config';
import Runtime from './runtime';

const TOOL_FILE_NAME = 'tool';
const TOOL_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_TOOL_FILE_FORMAT = 'json5';

export class Tool {
  constructor(properties) {
    Object.assign(this, properties);
    this.toolDir = dirname(this.toolFile);
  }

  static async create(obj) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }
    if (!obj.name) {
      throw new Error("Tool 'name' property is missing");
    }
    if (!obj.toolFile) {
      throw new Error("Tool 'toolFile' property is missing");
    }

    const tool = new this({
      name: this.normalizeName(obj.name),
      version: obj.version && Version.create(obj.version),
      description: obj.description,
      authors: obj.authors || obj.author,
      license: obj.license,
      repository: obj.repository && this.normalizeRepository(obj.repository),
      config: Config.create(obj.config),
      runtime: obj.runtime && Runtime.create(obj.runtime),
      toolFile: obj.toolFile
    });

    tool.commands = Command.createMany(tool, obj.commands);

    if (obj.defaultCommand) {
      tool.defaultCommand = Command.create(tool, obj.defaultCommand, '__default__');
    }

    return tool;
  }

  static async load(dir) {
    const file = this.searchFile(dir, {searchInPath: true});
    const obj = readFile(file, {parse: true});
    return await this.create({...obj, toolFile: file});
  }

  static async ensure(dir, {toolFileFormat = DEFAULT_TOOL_FILE_FORMAT} = {}) {
    let file = this.searchFile(dir, {errorIfNotFound: false});
    let obj;
    if (file) {
      obj = readFile(file, {parse: true});
    } else {
      file = join(dir, TOOL_FILE_NAME + '.' + toolFileFormat);
      obj = {name: basename(dir), version: '0.1.0-planning'};
      writeFile(file, obj, {stringify: true});
    }
    return await this.create({...obj, toolFile: file});
  }

  static async resolveInvocation(invocation) {
    let dir = invocation.dir;

    while (true) {
      const file = this.searchFile(dir);
      if (file) {
        const obj = readFile(file, {parse: true});
        const tool = await this.create({...obj, toolFile: file});
        // console.dir(tool, {depth: 5});
        const invocations = tool.resolveInvocation(invocation);
        if (invocations !== invocation) {
          return invocations;
        }
      }

      const parentDir = join(dir, '..');
      if (parentDir === dir) {
        return [invocation];
      }

      dir = parentDir;
    }
  }

  static searchFile(dir) {
    for (const format of TOOL_FILE_FORMATS) {
      const file = join(dir, TOOL_FILE_NAME + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }
  }

  resolveInvocation(invocation) {
    const cmd = this.findCommand(invocation.arguments[0]);
    if (!cmd) {
      return invocation;
    }
    // invocation = invocation.clone();
    // invocation.arguments.shift();
    return cmd.resolveInvocation(invocation);
  }

  // static searchFile(dir, opts = {}) {
  //   const {searchInPath = false, errorIfNotFound = true} = opts;
  //
  //   for (const format of TOOL_FILE_FORMATS) {
  //     const file = join(dir, TOOL_FILE_NAME + '.' + format);
  //     if (existsSync(file)) {
  //       return file;
  //     }
  //   }
  //
  //   if (searchInPath) {
  //     const parentDir = join(dir, '..');
  //     if (parentDir !== dir) {
  //       return this.searchFile(parentDir, opts);
  //     }
  //   }
  //
  //   if (errorIfNotFound) {
  //     throw createUserError(
  //       `No tool file found in the ${searchInPath ? 'current and parent directories' : 'current directory'}`
  //     );
  //   }
  //
  //   return undefined;
  // }
  //
  // async run(invocation, baseDir) {
  //   const cmd = this.findCommand(invocation.name);
  //   if (cmd) {
  //     return await cmd.run(invocation);
  //   }
  //
  //   if (!this.runtime) {
  //     throw createUserError(
  //       `Trying to run ${formatCode(invocation.name)} but no runtime is defined for the tool ${formatPath(this.name)}`
  //     );
  //   }
  //
  //   return await this.runtime.run({
  //     file: resolve(baseDir || this.toolDir, invocation.name),
  //     arguments: invocation.arguments,
  //     config: this.config.merge(invocation.config) // <----------
  //   });
  // }

  findCommand(name) {
    if (name.startsWith('.') || isAbsolute(name)) {
      return undefined; // Little optimization
    }
    for (const cmd of this.commands) {
      if (cmd.isMatching(name)) {
        return cmd;
      }
    }
    return undefined;
  }

  getNameUniverse() {
    const [universe, identifier] = this.name.split('/');
    if (!identifier) {
      return undefined;
    }
    return universe;
  }

  getNameIdentifier() {
    const [universe, identifier] = this.name.split('/');
    if (!identifier) {
      return universe;
    }
    return identifier;
  }

  static normalizeName(name) {
    if (!name) {
      throw new Error("Tool 'name' property is missing");
    }

    name = name.trim();

    if (!this.validateName(name)) {
      throw createUserError(`Tool name '${name}' is invalid`);
    }

    return name;
  }

  static validateName(name) {
    let [universe, identifier, rest] = name.split('/');

    if (universe && !identifier) {
      identifier = universe;
      universe = undefined;
    }

    if (!this.validateNamePart(identifier)) {
      return false;
    }

    if (universe && !this.validateNamePart(universe)) {
      return false;
    }

    if (rest) {
      return false;
    }

    return true;
  }

  static validateNamePart(part) {
    if (!part) {
      return false;
    }

    if (/[^a-z0-9._-]/i.test(part)) {
      return false;
    }

    if (/[^a-z0-9]/i.test(part[0] + part[part.length - 1])) {
      return false;
    }

    return true;
  }

  static normalizeRepository(repository) {
    // TODO: more normalizations...
    // Also, we should not assume that the repository type is always Git
    return repository.url || repository;
  }
}

export default Tool;
