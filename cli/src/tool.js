import {existsSync} from 'fs';
import {join, resolve, dirname, basename, isAbsolute} from 'path';
import {
  readFile,
  writeFile,
  throwUserError,
  checkMistakes,
  formatString,
  formatPath,
  formatCode
} from 'run-common';

import Alias from './alias';
import Version from './version';
import Command from './command';
import Config from './config';
import Runtime from './runtime';
import Expression from './expression';

const TOOL_FILE_NAME = 'tool';
const TOOL_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_TOOL_FILE_FORMAT = 'json5';

export class Tool {
  constructor(properties) {
    Object.assign(this, properties);
  }

  static async create(obj, context) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (!obj.toolFile) {
      throw new Error(`Tool 'toolFile' property is missing`);
    }

    context = this.extendContext(context, obj);

    checkMistakes(
      obj,
      {
        alias: 'aliases',
        author: 'authors',
        command: 'commands',
        extends: 'extend',
        imports: 'import',
        exports: 'export'
      },
      {context}
    );

    const toolDir = dirname(obj.toolFile);

    const tool = new this({
      name: obj.name && this.normalizeName(obj.name, context),
      aliases: Alias.createMany(obj.aliases || [], context),
      version: obj.version && Version.create(obj.version, context),
      description: obj.description,
      authors: obj.authors,
      license: obj.license,
      repository: obj.repository && this.normalizeRepository(obj.repository),
      config: Config.create(obj.config || {}, context),
      runtime: obj.runtime && Runtime.create(obj.runtime, context),
      toolFile: obj.toolFile,
      toolDir
    });

    // tool.basetools = await this.extendMany(tool, obj.extend || [], context);
    tool.commands = Command.createMany(obj.commands || [], context);
    tool.importedTools = await this.importFromExpressions(toolDir, obj.import || [], context);

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

  static async import(dir, source, config, context) {
    if (!dir) {
      throw new Error("'dir' parameter is missing");
    }

    if (!source) {
      throw new Error("'source' parameter is missing");
    }

    if (!config) {
      throw new Error("'config' parameter is missing");
    }

    let file = resolve(dir, source);
    file = this.searchFile(file);
    if (!file) {
      throwUserError(`Tool import not found: ${formatPath(source)}`, {
        context
      });
    }

    let obj = readFile(file, {parse: true});

    obj = {
      name: obj.name,
      aliases: obj.aliases,
      version: obj.version,
      description: obj.description,
      authors: obj.authors,
      license: obj.license,
      ...obj.export,
      toolFile: file
    };

    return await this.create(obj);
  }

  static async importFromExpressions(dir, expressions, context) {
    if (!dir) {
      throw new Error("'dir' parameter is missing");
    }

    if (!expressions) {
      throw new Error("'expressions' parameter is missing");
    }

    if (Array.isArray(expressions)) {
      expressions = expressions.join(', ');
    }

    if (typeof expressions !== 'string') {
      throwUserError(`${formatCode('import')} property must be a string or an array`, {context});
    }

    expressions = Expression.createMany(expressions, context);

    return Promise.all(
      expressions.map(expression => {
        if (expression.arguments.length !== 1) {
          throwUserError(`Invalid ${formatCode('import')} source:`, {
            info: formatString(expression.arguments.join(' ')),
            context
          });
        }
        const source = expression.arguments[0];
        const config = expression.config;
        return this.import(dir, source, config, context);
      })
    );
  }

  canRun(expression) {
    const cmdName = expression.getCommandName();
    return !cmdName ||
      Boolean(this.findCommand(cmdName)) ||
      Boolean(this.findImportedTool(cmdName));
  }

  async run(expression, context) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display tool help');
      return;
    }

    const cmd = this.findCommand(commandName);
    if (cmd) {
      return await cmd.run(this, newExpression, context);
    }

    const importedTool = this.findImportedTool(commandName);
    if (importedTool) {
      return await importedTool.run(newExpression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
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

  findImportedTool(name) {
    for (const importedTool of this.importedTools) {
      if (importedTool.isMatching(name)) {
        return importedTool;
      }
    }
    return undefined;
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
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
