export default base =>
  class Person extends base {
    getGreeting(ageLimit) {
      const greeting = this.age < ageLimit ? 'Hi' : 'Hello';
      return `${greeting} ${this.name}!`;
    }
  };
