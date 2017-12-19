module.exports = base =>
  class Person extends base {
    async formatGreetingMethod({verb, shout}) {
      const name = this.name || 'Anonymous';
      let result = `${verb} ${name}!`;
      if (shout) {
        result = result.toUpperCase();
      }
      return result;
    }

    async formatTags({tags}) {
      return tags.join(', ');
    }

    async formatNameAndAge({name, age}) {
      let result = name;
      if (age !== undefined) {
        result += ` (${age})`;
      }
      return result;
    }

    async build() {
      this.hasBeenBuilt = true;
    }

    async hookTest() {
      this.hookTestResults = [...this.hookTestResults, 'hookTest'];
    }

    async beforeHookTest() {
      this.hookTestResults = [...this.hookTestResults, 'beforeHookTest'];
    }

    async afterHookTest() {
      this.hookTestResults = [...this.hookTestResults, 'afterHookTest'];
    }
  };
