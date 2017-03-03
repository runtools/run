export class Config {
  constructor(normalizedConfig) {
    Object.assign(this, normalizedConfig);
  }

  static normalize(config = {}) {
    const normalizedConfig = config;
    // TODO: more normalizations
    return new this(normalizedConfig);
  }

  merge(other) {
    return this; // TODO
  }
}

export default Config;
