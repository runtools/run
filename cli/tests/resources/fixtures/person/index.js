export default base =>
  class Person extends base {
    getGreeting() {
      const greeting = this.age < 45 ? 'Hi' : 'Hello';
      return `${greeting} ${this.name}!`;
    }
  };
