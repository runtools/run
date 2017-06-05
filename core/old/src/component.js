import {existsSync} from 'fs';
import {join, resolve, dirname, basename} from 'path';
import isDirectory from 'is-directory';
import {
  readFile,
  writeFile,
  throwUserError,
  addContextToErrors,
  formatPath,
  formatCode,
  callSuper
} from 'run-common';

import Entity from './entity';
import Property from './property';

export class Component extends Entity {
  static SUPPORTED_FILE_FORMATS = ['json5', 'json', 'yaml', 'yml'];
  static DEFAULT_FILE_NAME = 'component';
  static DEFAULT_FILE_FORMAT = 'json5';

  static BUILT_IN_PROPERTIES = [];

  constructor(definition: Object = {}, {file} = {}) {
    super(definition);
    this.setComponentFile(file);
    addContextToErrors(() => {
      this.is = definition.is; // => types
      this.has = definition.has; // => properties
      for (const property of this.getProperties()) {
        this[property.name] = definition[property.name];
      }
    }).call(this);
  }

  extendedComponents = [];
  includedComponents = [];

  get is() {
    let is = this._is;
    if (is) {
      if (is.length === 0) {
        is = undefined;
      } else if (is.length === 1) {
        is = is[0];
      }
    }
    return is;
  }

  set is(sources: Array<string> | string = []) {
    if (typeof sources === 'string') {
      sources = [sources];
    }
    this._is = sources;
  }

  get properties() {
    const properties = this._properties;
    return properties && properties.length ? properties : undefined;
  }

  set properties(properties: ?(Array | Object | string)) {
    if (properties !== undefined) {
      properties = Property.createMany(properties);
    }
    this._properties = properties && properties.length ? properties : undefined;
  }

  getPropertyValue(name) {
    const value = this[name];
    return value === undefined ? this.getProperty(name).default : value;
  }

  getProperty(name) {
    const property = this.find(
      component =>
        component.properties && component.properties.find(property => property.name === name)
    );
    if (!property) {
      throw new Error(`Property ${formatCode(name)} not found`);
    }
    return property;
  }

  getProperties() {
    const properties = this.reduce(
      (properties, component) => {
        if (component.properties) {
          for (const property of component.properties) {
            if (!properties.find(prop => prop.name === property.name)) {
              properties.push(property);
            }
          }
        }
        return properties;
      },
      []
    );

    return [...this.constructor.BUILT_IN_PROPERTIES, ...properties];
  }

  getComponentFile() {
    return this.__file__;
  }

  setComponentFile(file) {
    this.__file__ = file;
  }

  getComponentDir() {
    return dirname(this.getComponentFile());
  }

  toJSON() {
    return {
      ...super.toJSON(),
      is: this.is,
      has: this.has
    };
  }

  toIdentifier() {
    let identifier = super.toIdentifier();
    const file = this.getComponentFile();
    if (file) {
      identifier += ' (' + file + ')';
    }
    return identifier;
  }

  static async create(definition, {source, file, context}: {source: string, file: string} = {}) {
    const dir = dirname(file);

    Object.assign(component, {
      extendedComponents: await this.extendMany(definition.is || [], {dir, context}),
      includedComponents: await this.includeMany(definition.has || [], {dir, context})
    });

    return component;
  }

  static async load(source, {dir, searchInPath, context} = {}) {
    const result = await this._load(source, {dir, searchInPath, context});
    if (!result) {
      return undefined;
    }

    const {file, definition} = result;
    return await this.create(definition, {source, file, context});
  }

  static async _load(source, {dir, searchInPath}) {
    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const file = this.searchComponentFile(source, {searchInPath});
    if (file) {
      const definition = readFile(file, {parse: true});
      return {file, definition};
    }

    return undefined;
  }

  static async ensure(dir, {componentFileFormat = this.DEFAULT_FILE_FORMAT, context} = {}) {
    let file = this.searchComponentFile(dir);
    let definition;
    if (file) {
      definition = readFile(file, {parse: true});
    } else {
      file = join(dir, this.DEFAULT_FILE_NAME + '.' + componentFileFormat);
      definition = {name: basename(dir), version: '0.1.0-pre-alpha'};
      writeFile(file, definition, {stringify: true});
    }
    return await this.create(definition, {file, context});
  }

  async save({destination = this.getComponentFile(), _context}: {destination: ?string}) {
    writeFile(destination, this, {stringify: true});
  }

  static async loadUserComponent(dir, {context} = {}) {
    const component = await this.load(dir, {searchInPath: true, context});
    if (!component) {
      return undefined;
    }

    dir = dirname(component.getComponentFile());
    const parentDir = join(dir, '..');
    if (parentDir !== dir) {
      /* const parentEntity = */ await this.loadUserComponent(parentDir, {context});
      // if (parentEntity) {
      //   component.parentEntity = parentEntity;
      // }
    }

    return component;
  }

  static searchComponentFile(dirOrFile, {searchInPath = false} = {}) {
    let dir;

    if (isDirectory.sync(dirOrFile)) {
      dir = dirOrFile;
    } else if (existsSync(dirOrFile)) {
      const file = dirOrFile;
      const filename = basename(file);
      if (
        this.SUPPORTED_FILE_FORMATS.find(
          format => filename === this.DEFAULT_FILE_NAME + '.' + format
        )
      ) {
        return file;
      }
    }

    if (!dir) {
      return undefined;
    }

    for (const format of this.SUPPORTED_FILE_FORMATS) {
      const file = join(dir, this.DEFAULT_FILE_NAME + '.' + format);
      if (existsSync(file)) {
        return file;
      }
    }

    if (searchInPath) {
      const parentDir = join(dir, '..');
      if (parentDir !== dir) {
        return this.searchComponentFile(parentDir, {searchInPath});
      }
    }

    return undefined;
  }

  static async extend(source: string, {dir, context}: {dir: string}) {
    if (!source) {
      throwUserError(`Base component ${formatCode('source')} cannot be empty`, {context});
    }

    const component = await this.load(source, {dir, context});
    if (!component) {
      throwUserError(`Base component not found: ${formatPath(source)}`, {
        context
      });
    }
    return component;
  }

  static extendMany(sources: Array | string, {dir, context}: {dir: string}) {
    if (typeof sources === 'string') {
      sources = [sources];
    }

    return Promise.all(
      sources.map(source => {
        return this.extend(source, {dir, context});
      })
    );
  }

  static async include(source: string, {dir, context}: {dir: string}) {
    if (!source) {
      throwUserError(`Component ${formatCode('source')} cannot be empty`, {context});
    }

    if (source.startsWith('.')) {
      source = resolve(dir, source);
    }

    const component = await this.load(source, {context});
    if (!component) {
      throwUserError(`Component not found: ${formatPath(source)}`, {
        context
      });
    }
    return component;
  }

  static includeMany(sources: Array | string, {dir, context}: {dir: string}) {
    if (typeof sources === 'string') {
      sources = [sources];
    }

    return Promise.all(
      sources.map(source => {
        return this.include(source, {dir, context});
      })
    );
  }

  async run(expression, {context}) {
    const {commandName, expression: newExpression} = expression.pullCommandName();

    if (!commandName) {
      console.log('TODO: display component help');
      return;
    }

    const includedComponent = this.findIncludedComponent(commandName);
    if (includedComponent) {
      return await includedComponent.run(newExpression, {context});
    }

    return await callSuper(Component.prototype.run, this, expression, {context});
  }

  find(fn) {
    // Breadth-first with extended components
    const components = [this];
    while (components.length) {
      const component = components.shift();
      const result = fn(component);
      if (result !== undefined) {
        return result;
      }
      components.push(...component.extendedComponents);
    }

    // // Depth-first with parent entities
    // if (this.parentEntity) {
    //   return this.parentEntity.find(fn);
    // }

    return undefined;
  }

  reduce(fn, initialValue) {
    // Breadth-first with extended components
    let accumulator = initialValue;
    const components = [this];
    while (components.length) {
      const component = components.shift();
      accumulator = fn(accumulator, component);
      components.push(...component.extendedComponents);
    }

    // // Depth-first with parent entities
    // if (this.parentEntity) {
    //   return this.parentEntity.reduce(fn, accumulator);
    // }

    return accumulator;
  }

  findExtendedComponent(name) {
    return this.find(component => {
      for (const extendedComponent of component.extendedComponents) {
        if (extendedComponent.isMatching(name)) {
          return extendedComponent;
        }
      }
      return undefined;
    });
  }

  findIncludedComponent(name) {
    return this.find(component => {
      for (const includedComponent of component.includedComponents) {
        if (includedComponent.isMatching(name)) {
          return includedComponent;
        }
      }
      return undefined;
    });
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
}

export default Component;
