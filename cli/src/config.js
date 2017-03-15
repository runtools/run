export class Config {
  constructor(config) {
    Object.assign(this, config);
  }

  static create(obj, context) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    return new this(obj);
  }

  getDefaults() {
    return this;
  }
}

export default Config;
