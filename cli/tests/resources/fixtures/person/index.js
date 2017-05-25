export default base =>
  class Person extends base {
    formatGreetingMethod(verb) {
      return `${verb} ${this.name}!`;
    }

    formatGreetingCommand({ageLimit}) {
      const verb = this.age < ageLimit ? 'Hi' : 'Hello';
      return this.formatGreetingMethod(verb);
    }
  };
