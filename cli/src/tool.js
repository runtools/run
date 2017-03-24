import {existsSync} from 'fs';
import {join, resolve, dirname, basename} from 'path';
import {defaultsDeep} from 'lodash';
import isDirectory from 'is-directory';
import {
  readFile,
  writeFile,
  throwUserError,
  avoidCommonMistakes,
  formatString,
  formatPath,
  formatCode
} from 'run-common';

import Alias from './alias';
import Version from './version';
import Command from './command';
import Option from './option';
import Subtool from './subtool';
import Config from './config';
import Engine from './engine';

const TOOL_FILE_NAME = 'tool';
const TOOL_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
const DEFAULT_TOOL_FILE_FORMAT = 'json5';

export class Tool {
  constructor(tool) {
    Object.assign(this, tool);
  }

  static async create(file, definition, {importMode, context} = {}) {
    if (!file) {
      throw new Error("'file' argument is missing");
    }

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    context = this.extendContext(context, {file});

    avoidCommonMistakes(
      definition,
      {
        alias: 'aliases',
        author: 'authors',
        command: 'commands',
        option: 'options',
        extends: 'extend',
        imports: 'import',
        exports: 'export',
        configs: 'config',
        engines: 'engine'
      },
      {context}
    );

    const dir = dirname(file);

    const baseDefinition = importMode ? definition.export || {} : definition;

    const engine = baseDefinition.engine || definition.engine;

    const tool = new this({
      name: definition.name && this.normalizeName(definition.name, context),
      aliases: Alias.createMany(definition.aliases || [], context),
      version: definition.version && Version.create(definition.version, context),
      description: definition.description,
      authors: definition.authors,
      license: definition.license,
      repository: definition.repository && this.normalizeRepository(definition.repository),
      extendedTools: await this.extendMany(dir, definition.extend || [], {importMode, context}),
      commands: Command.createMany(dir, baseDefinition.commands || [], context),
      options: Option.createMany(baseDefinition.options || [], context),
      importedTools: await this.importMany(dir, baseDefinition.import || [], context),
      config: Config.normalize(baseDefinition.config || {}, context),
      engine: engine && Engine.create(engine, context),
      file
    });

    tool.subtools = Subtool.createMany(tool, baseDefinition.subtools || [], context);

    return tool;
  }

  static extendContext(base, obj) {
    return {...base, tool: formatPath(obj.file)};
  }

  static async load(source, {importMode, context} = {}) {
    // TODO: load tools from registry
    const file = this.searchToolFile(source);
    if (!file) {
      return undefined;
    }
    const definition = readFile(file, {parse: true});
    return await this.create(file, definition, {importMode, context});
  }

  static async ensure(dir, {toolFileFormat = DEFAULT_TOOL_FILE_FORMAT, context} = {}) {
    let file = this.searchToolFile(dir);
    let definition;
    if (file) {
      definition = readFile(file, {parse: true});
    } else {
      file = join(dir, TOOL_FILE_NAME + '.' + toolFileFormat);
      definition = {name: basename(dir), version: '0.1.0-pre-alpha'};
      writeFile(file, definition, {stringify: true});
    }
    return await this.create(file, definition, {context});
  }

  static async loadGlobals(dir, {config, engine, context}) {
    const tool = await this.load(dir, {context});
    if (tool) {
      defaultsDeep(config, tool.getConfig());
      if (!engine) {
        engine = tool.getEngine();
      }
    }

    const parentDir = join(dir, '..');
    if (parentDir !== dir) {
      return await this.loadGlobals(parentDir, {config, engine, context});
    }

    return {config, engine};
  }

  static searchToolFile(dirOrFile, {searchInPath = false} = {}) {
    let dir;

    if (isDirectory.sync(dirOrFile)) {
      dir = dirOrFile;
    } else if (existsSync(dirOrFile)) {
      const file = dirOrFile;
      const filename = basename(file);
      if (TOOL_FILE_FORMATS.find(format => filename === TOOL_FILE_NAME + '.' + format)) {
        return file;
      }
    }

    if (!dir) {
      return undefined;
    }

    for (const format of TOOL_FILE_FORMATS) {
      const file = join(dir, TOOL_FILE_NAME + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }

    if (searchInPath) {
      const parentDir = join(dir, '..');
      if (parentDir !== dir) {
        return this.searchToolFile(parentDir, {searchInPath});
      }
    }

    return undefined;
  }

  static async extend(dir, source, {importMode, context}) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    if (typeof source !== 'string') {
      throwUserError(`Tool extend ${formatCode('source')} must be a string`, {context});
    }

    source = source.trim();

    if (!source) {
      throwUserError(`Tool extend ${formatCode('source')} cannot be empty`, {context});
    }

    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const tool = await this.load(source, {importMode, context});
    if (!tool) {
      throwUserError(`Tool extend not found: ${formatPath(source)}`, {
        context
      });
    }
    return tool;
  }

  static async extendMany(dir, sources, {importMode, context}) {
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
      throwUserError(`${formatCode('extend')} property must be a string or an array`, {context});
    }

    return Promise.all(
      sources.map(source => {
        return this.extend(dir, source, {importMode, context});
      })
    );
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

    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const tool = await this.load(source, {importMode: true, context});
    if (!tool) {
      throwUserError(`Tool not found: ${formatPath(source)}`, {
        context
      });
    }
    return tool;
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
      Boolean(this.findSubtool(cmdName)) ||
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

    const subtool = this.findSubtool(commandName);
    if (subtool) {
      return await subtool.run(runner, newExpression, context);
    }

    const importedTool = this.findImportedTool(commandName);
    if (importedTool) {
      return await importedTool.run(runner, newExpression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
  }

  find(fn) {
    // Breadth-first search considering a tool and its base tools
    const tools = [this];
    while (tools.length) {
      const tool = tools.shift();
      const result = fn(tool);
      if (result !== undefined) {
        return result;
      }
      tools.push(...tool.extendedTools);
    }
    return undefined;
  }

  reduce(fn, initialValue) {
    // Breadth-first reduce considering a tool and its base tools
    let accumulator = initialValue;
    const tools = [this];
    while (tools.length) {
      const tool = tools.shift();
      accumulator = fn(accumulator, tool);
      tools.push(...tool.extendedTools);
    }
    return accumulator;
  }

  findCommand(name) {
    return this.find(tool => {
      for (const cmd of tool.commands) {
        if (cmd.isMatching(name)) {
          return cmd;
        }
      }
      return undefined;
    });
  }

  findSubtool(name) {
    return this.find(tool => {
      for (const subtool of tool.subtools) {
        if (subtool.isMatching(name)) {
          return subtool;
        }
      }
      return undefined;
    });
  }

  findImportedTool(name) {
    return this.find(tool => {
      for (const importedTool of tool.importedTools) {
        if (importedTool.isMatching(name)) {
          return importedTool;
        }
      }
      return undefined;
    });
  }

  getConfig() {
    return this.reduce(
      (config, tool) => {
        defaultsDeep(config, tool.config);
        return config;
      },
      {}
    );
  }

  getDefaultConfig() {
    // Fetch default config from options
    return this.reduce(
      (config, tool) => {
        for (const option of tool.options) {
          config[option.name] = option.default;
        }
        return config;
      },
      {}
    );
  }

  getEngine() {
    return this.find(tool => tool.engine);
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
