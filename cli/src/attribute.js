import {isEqual, entries, isPlainObject} from 'lodash';
import {addContextToErrors, compactObject} from 'run-common';

import Entity from './entity';
import Type from './type';

export class Attribute extends Entity {
  constructor(definition: {name: string} | string) {
    if (typeof definition === 'string') {
      definition = {name: definition};
    }
    super(definition);
    addContextToErrors(() => {
      this.type = definition.type;
      this.default = definition.default;
    }).call(this);
  }

  get type() {
    if (!this._type) {
      this._type = this.getDefaultType();
    }
    return this._type;
  }

  set type(type: ?string) {
    this._type = type ? new Type(type) : undefined;
  }

  get default() {
    return this._default;
  }

  set default(value) {
    this._default = value;
    this._defaultType = undefined;
  }

  getDefaultType() {
    if (!this._defaultType) {
      this._defaultType = new Type(Type.infer(this.default));
    }
    return this._defaultType;
  }

  toJSON() {
    let type = this.type.toJSON();
    const defaultType = this.getDefaultType().toJSON();
    if (isEqual(type, defaultType)) {
      type = undefined;
    }
    let json = {...super.toJSON(), type, default: this.default};
    json = compactObject(json);
    if (Object.keys(json).length === 1) {
      // If there is only one property, it must be the name and we can simplify the JSON
      json = json.name;
    }
    return json;
  }

  static createMany(definitions: ?(Array | Object | string) = []) {
    if (typeof definitions === 'string') {
      definitions = [definitions];
    }

    if (!Array.isArray(definitions)) {
      definitions = entries(definitions).map(([name, definition]) => {
        if (!isPlainObject(definition)) {
          definition = {default: definition};
        }
        definition.name = name;
        return definition;
      });
    }

    return definitions.map(definition => new this(definition));
  }
}

export default Attribute;
