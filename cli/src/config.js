export class Config {
  constructor(config) {
    Object.assign(this, config);
  }

  static create(obj = {}) {
    const config = obj;
    // TODO: more normalizations
    return new this(config);
  }

  merge(other) {
    return new this.constructor({...this, ...other}); // TODO: deep merge
  }
}

export default Config;
