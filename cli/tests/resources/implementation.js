import ObjectResource from '../../src/resources/object';

describe('Resource implementation', () => {
  test('can implement a method', async () => {
    const Person = await ObjectResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.getGreeting()).toBe('Hi Manu!');
    person.age++;
    expect(person.getGreeting()).toBe('Hello Manu!');
  });
});
