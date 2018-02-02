export default () => ({
  async build() {
    await super.build();
    this.hasBeenBuiltByInstance = true;
  },

  async test() {
    this.hasBeenTested = true;
  },

  async instanceBeforeHookTest() {
    this.hookTestResults = [...this.hookTestResults, 'instanceBeforeHookTest'];
  },

  async instanceAfterHookTest() {
    this.hookTestResults = [...this.hookTestResults, 'instanceAfterHookTest'];
  }
});
