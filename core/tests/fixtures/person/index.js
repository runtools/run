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

    async build() {
      this.hasBeenBuilt = true;
    }

    async publish() {}
  };
