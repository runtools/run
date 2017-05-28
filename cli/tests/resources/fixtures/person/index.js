module.exports = base =>
  class Person extends base {
    formatGreetingMethod(verb) {
      const name = this.name || 'Anonymous';
      return `${verb} ${name}!`;
    }

    formatGreetingCommand({ageLimit}) {
      const verb = this.age < ageLimit ? 'Hi' : 'Hello';
      return this.formatGreetingMethod(verb);
    }
  };
