import {cloneDeep, defaultsDeep} from 'lodash';

export class Config {
  constructor(config) {
    Object.assign(this, config);
  }

  static create(obj = {}) {
    return new this(obj);
  }

  clone() {
    return new this.constructor(cloneDeep(this));
  }

  setDefaults(...sources) {
    defaultsDeep(this, ...sources);
  }
}

export default Config;
