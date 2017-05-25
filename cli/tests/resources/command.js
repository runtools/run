import CommandResource from '../../src/resources/command';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';
import CompositeResource from '../../src/resources/composite';

describe('CommandResource', () => {
  test('can have options', async () => {
    const command = await CommandResource.$create({
      $options: {name: {$type: 'string'}, age: {$type: 'number'}}
    });
    expect(command).toBeInstanceOf(CommandResource);
    expect(command.$getOptions()).toHaveLength(2);
    expect(command.$getOptions()[0]).toBeInstanceOf(StringResource);
    expect(command.$getOptions()[0].$id).toBe('name');
    expect(command.$getOptions()[1]).toBeInstanceOf(NumberResource);
    expect(command.$getOptions()[1].$id).toBe('age');
  });

  test('can be invoked', async () => {
    const Person = await CompositeResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.formatGreetingCommand()).toBe('Hi Manu!');
    person.age++;
    expect(person.formatGreetingCommand()).toBe('Hello Manu!');
    expect(person.formatGreetingCommand({ageLimit: 46})).toBe('Hi Manu!');
    expect(() => person.formatGreetingCommand({ageLimit: 46}, true)).toThrow();
  });

  test('is serializable', async () => {
    expect((await CommandResource.$create()).$serialize()).toEqual();
    expect((await CommandResource.$create({$type: 'command'})).$serialize()).toEqual({
      $type: 'command'
    });
    expect((await CommandResource.$create({$option: {name: 'Manu'}})).$serialize()).toEqual({
      $option: {name: 'Manu'}
    });
    expect(
      (await CommandResource.$create({$options: {name: 'Manu', age: 44}})).$serialize()
    ).toEqual({$options: {name: 'Manu', age: 44}});
  });
});
