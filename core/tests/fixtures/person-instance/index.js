module.exports = base =>
  class PersonInstance extends base {
    async instanceBuild() {
      this.instanceHasBeenBuilt = true;
    }

    async instanceBeforeHookTest() {
      this.hookTestResults = [...this.hookTestResults, 'instanceBeforeHookTest'];
    }

    async instanceAfterHookTest() {
      this.hookTestResults = [...this.hookTestResults, 'instanceAfterHookTest'];
    }
  };
