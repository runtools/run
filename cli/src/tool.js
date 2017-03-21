import {existsSync} from 'fs';
import {join, resolve, dirname, basename} from 'path';
import {defaultsDeep} from 'lodash';
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
import Option from './option';
import Engine from './engine';
import Config from './config';

const TOOL_FILE_NAME = 'tool';
const TOOL_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_TOOL_FILE_FORMAT = 'json5';

export class Tool {
  constructor(tool) {
    Object.assign(this, tool);
  }

  static async create(file, definition, context) {
    if (!file) {
      throw new Error("'file' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    context = this.extendContext(context, {file});

    checkMistakes(
      definition,
      {
        alias: 'aliases',
        author: 'authors',
        command: 'commands',
        option: 'options',
        extends: 'extend',
        imports: 'import',
        exports: 'export'
      },
      {context}
    );

    const dir = dirname(file);

    const tool = new this({
      name: definition.name && this.normalizeName(definition.name, context),
      aliases: Alias.createMany(definition.aliases || [], context),
      version: definition.version && Version.create(definition.version, context),
      description: definition.description,
      authors: definition.authors,
      license: definition.license,
      repository: definition.repository && this.normalizeRepository(definition.repository),
      commands: Command.createMany(dir, definition.commands || [], context),
      options: Option.createMany(definition.options || [], context),
      importedTools: await this.importMany(dir, definition.import || [], context),
      engine: definition.engine && Engine.create(definition.engine, context),
      file
    });

    return tool;
  }

  static extendContext(base, obj) {
    return {...base, tool: formatPath(obj.file)};
  }

  static async load(dir) {
    const file = this.searchFile(dir);
    if (!file) {
      return undefined;
    }
    const definition = readFile(file, {parse: true});
    return await this.create(file, definition);
  }

  static async ensure(dir, {toolFileFormat = DEFAULT_TOOL_FILE_FORMAT} = {}) {
    let file = this.searchFile(dir);
    let definition;
    if (file) {
      definition = readFile(file, {parse: true});
    } else {
      file = join(dir, TOOL_FILE_NAME + '.' + toolFileFormat);
      definition = {name: basename(dir), version: '0.1.0-pre-alpha'};
      writeFile(file, definition, {stringify: true});
    }
    return await this.create(file, definition);
  }

  static async loadGlobals(dir, {config, engine}) {
    const file = this.searchFile(dir);
    if (file) {
      const context = {file};

      const toolDefinition = readFile(file, {parse: true});

      let toolConfig = toolDefinition.config;
      if (toolConfig) {
        toolConfig = Config.normalize(toolConfig, context);
        defaultsDeep(config, toolConfig);
      }

      let toolEngine = toolDefinition.engine;
      if (!engine && toolEngine) {
        toolEngine = Engine.create(toolEngine, context);
        engine = toolEngine;
      }
    }

    const parentDir = join(dir, '..');
    if (parentDir !== dir) {
      return await this.loadGlobals(parentDir, {config, engine});
    }

    return {config, engine};
  }

  static async loadConfig(file) {
    let config = readFile(file, {parse: true});
    config = Config.normalize(config, {file});
    return config;
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

  static async import(dir, source, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (typeof source !== 'string') {
      throwUserError(`Tool import ${formatCode('source')} must be a string`, {context});
    }

    source = source.trim();

    if (!source) {
      throwUserError(`Tool import ${formatCode('source')} cannot be empty`, {context});
    }

    let file = resolve(dir, source);
    file = this.searchFile(file);
    if (!file) {
      throwUserError(`Tool import not found: ${formatPath(source)}`, {
        context
      });
    }

    let definition = readFile(file, {parse: true});

    definition = {
      name: definition.name,
      aliases: definition.aliases,
      version: definition.version,
      description: definition.description,
      authors: definition.authors,
      license: definition.license,
      ...definition.export
    };

    return await this.create(file, definition);
  }

  static async importMany(dir, sources, context) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (!sources) {
      throw new Error("'sources' argument is missing");
    }

    if (typeof sources === 'string') {
      sources = sources.split(',');
    }

    if (!Array.isArray(sources)) {
      throwUserError(`${formatCode('import')} property must be a string or an array`, {context});
    }

    return Promise.all(
      sources.map(source => {
        return this.import(dir, source, context);
      })
    );
  }

  canRun(expression) {
    const cmdName = expression.getCommandName();
    return !cmdName ||
      Boolean(this.findCommand(cmdName)) ||
      Boolean(this.findImportedTool(cmdName));
  }

  async run(runner, expression, context) {
    context = this.constructor.extendContext(context, this);

    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display tool help');
      return;
    }

    const cmd = this.findCommand(commandName);
    if (cmd) {
      return await cmd.run(runner, this, newExpression, context);
    }

    const importedTool = this.findImportedTool(commandName);
    if (importedTool) {
      return await importedTool.run(runner, newExpression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
  }

  findCommand(name) {
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

  getDefaultConfig() {
    const config = {};
    for (const option of this.options) {
      config[option.name] = option.default;
    }
    return config;
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
      throw new Error("'name' argument is missing");
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
