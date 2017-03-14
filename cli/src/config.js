export class Config {
  constructor(config) {
    Object.assign(this, config);
  }

  static create(obj = {}) {
    return new this(obj);
  }

  getDefaults() {
    return this;
  }
}

export default Config;
