import Resource from '../../src/resource';
import CommandResource from '../../src/primitives/command';
import StringResource from '../../src/primitives/string';
import NumberResource from '../../src/primitives/number';

describe('CommandResource', () => {
  test('can have options', () => {
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

  test('can be invoked', () => {
    const Person = Resource.$load('../fixtures/person', {directory: __dirname});
    let person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.formatGreetingCommand()).toBe('Hi Manu!');
    person.age++;
    expect(person.formatGreetingCommand()).toBe('Hello Manu!');
    expect(person.formatGreetingCommand({ageLimit: 46})).toBe('Hi Manu!');
    expect(person.formatGreetingCommand({limit: 46})).toBe('Hi Manu!');
    expect(() => person.formatGreetingCommand({ageLimit: 46}, true)).toThrow();

    person = Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(person.formatWordsCommand()).toBe('');
    expect(person.formatWordsCommand({capitalize: false})).toBe('');
    expect(person.formatWordsCommand('blue')).toBe('Blue.');
    expect(person.formatWordsCommand('blue', {capitalize: false})).toBe('blue.');
    expect(person.formatWordsCommand('blue', 'yellow')).toBe('Blue, yellow.');
    expect(person.formatWordsCommand('blue', 'yellow', {capitalize: false})).toBe('blue, yellow.');
  });

  test('is serializable', () => {
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
