export default class Person {
  greet() {
    const greeting = this.age < 45 ? 'Hi' : 'Hello';
    console.log(`${greeting} ${this.name}!`);
  }
}
