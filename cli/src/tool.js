import {existsSync} from 'fs';
import {join, dirname, basename, isAbsolute} from 'path';
import {
  readFile,
  writeFile,
  throwUserError,
  checkMistakes,
  formatString,
  formatPath,
  formatCode
} from 'run-common';

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

  static async create(obj, context) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (!obj.toolFile) {
      throw new Error(`Tool 'toolFile' property is missing`);
    }

    context = this.extendContext(context, obj);

    checkMistakes(obj, {author: 'authors', command: 'commands'}, {context});

    const tool = new this({
      name: obj.name && this.normalizeName(obj.name, context),
      version: obj.version && Version.create(obj.version, context),
      description: obj.description,
      authors: obj.authors,
      license: obj.license,
      repository: obj.repository && this.normalizeRepository(obj.repository),
      config: Config.create(obj.config || {}, context),
      runtime: obj.runtime && Runtime.create(obj.runtime, context),
      toolFile: obj.toolFile
    });

    tool.commands = Command.createMany(tool, obj.commands || [], context);

    return tool;
  }

  static extendContext(base, obj) {
    return {...base, tool: formatPath(obj.toolFile)};
  }

  static async load(dir) {
    const file = this.searchFile(dir);
    if (!file) {
      return undefined;
    }
    const obj = readFile(file, {parse: true});
    return await this.create({...obj, toolFile: file});
  }

  static async ensure(dir, {toolFileFormat = DEFAULT_TOOL_FILE_FORMAT} = {}) {
    let file = this.searchFile(dir);
    let obj;
    if (file) {
      obj = readFile(file, {parse: true});
    } else {
      file = join(dir, TOOL_FILE_NAME + '.' + toolFileFormat);
      obj = {name: basename(dir), version: '0.1.0-pre-alpha'};
      writeFile(file, obj, {stringify: true});
    }
    return await this.create({...obj, toolFile: file});
  }

  static searchFile(dir, {searchInPath = false} = {}) {
    for (const format of TOOL_FILE_FORMATS) {
      const file = join(dir, TOOL_FILE_NAME + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }

    if (searchInPath) {
      const parentDir = join(dir, '..');
      if (parentDir !== dir) {
        return this.searchFile(parentDir, {searchInPath});
      }
    }

    return undefined;
  }

  canRun(invocation) {
    const cmdName = invocation.getCommandName();
    return !cmdName || Boolean(this.findCommand(cmdName));
  }

  async run(invocation, context) {
    context = this.constructor.extendContext(context, this);

    const cmdName = invocation.getCommandName();

    if (!cmdName) {
      console.log('TODO: display tool help');
      return;
    }

    const cmd = this.findCommand(cmdName);

    if (!cmd) {
      throwUserError(`Command ${formatCode(cmdName)} not found`, {context});
    }

    return await cmd.run(invocation, context);
  }

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

  static normalizeName(name, context) {
    if (!name) {
      throw new Error(`${formatCode('name')} parameter is missing`);
    }

    name = name.trim();

    if (!this.validateName(name)) {
      throwUserError(`Tool name ${formatString(name)} is invalid`, {context});
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
    // We should not assume that the repository type is always Git
    return repository.url || repository;
  }
}

export default Tool;
