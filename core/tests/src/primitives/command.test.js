import Resource from '../../../dist/resource';
import CommandResource from '../../../dist/primitives/command';
import StringResource from '../../../dist/primitives/string';
import NumberResource from '../../../dist/primitives/number';

describe('CommandResource', () => {
  test('creation', () => {
    const command = CommandResource.$create({
      $options: {name: {$type: 'string'}, age: {$type: 'number'}}
    });
    expect(command).toBeInstanceOf(CommandResource);
    expect(command.$options).toHaveLength(2);
    expect(command.$options[0]).toBeInstanceOf(StringResource);
    expect(command.$options[0].$name).toBe('name');
    expect(command.$options[1]).toBeInstanceOf(NumberResource);
    expect(command.$options[1].$name).toBe('age');
  });

  test('invocation', () => {
    // options
    const Person = Resource.$import('../../fixtures/person', {directory: __dirname});

    const person = Person.$create({name: 'Manu', age: 44});
    expect(person.formatGreetingCommand()).toBe('Hi Manu!');
    person.age++;
    expect(person.formatGreetingCommand()).toBe('Hello Manu!');
    expect(person.formatGreetingCommand({ageLimit: 46})).toBe('Hi Manu!');
    expect(person.formatGreetingCommand({limit: 46})).toBe('Hi Manu!');
    expect(() => person.formatGreetingCommand({ageLimit: 46}, true)).toThrow();

    // variadic command
    expect(Person.formatWordsCommand()).toBe('');
    expect(Person.formatWordsCommand({capitalize: false})).toBe('');
    expect(Person.formatWordsCommand('blue')).toBe('Blue.');
    expect(Person.formatWordsCommand('blue', {capitalize: false})).toBe('blue.');
    expect(Person.formatWordsCommand('blue', 'yellow')).toBe('Blue, yellow.');
    expect(Person.formatWordsCommand('blue', 'yellow', {capitalize: false})).toBe('blue, yellow.');

    // options inherited from tool
    expect(Person.formatWordsCommand('blue', 'yellow')).toBe('Blue, yellow.');
    expect(Person.formatWordsCommand('blue', 'yellow', {shout: true})).toBe('BLUE, YELLOW.');
  });

  test('serialization', () => {
    expect(CommandResource.$create().$serialize()).toBeUndefined();
    expect(CommandResource.$create({$type: 'command'}).$serialize()).toEqual({$type: 'command'});
    expect(CommandResource.$create({$option: {name: 'Manu'}}).$serialize()).toEqual({
      $option: {name: 'Manu'}
    });
    expect(CommandResource.$create({$options: {name: 'Manu', age: 44}}).$serialize()).toEqual({
      $options: {name: 'Manu', age: 44}
    });
  });
});
