import Resource from '../../../dist/resource';
import CommandResource from '../../../dist/primitives/command';
import StringResource from '../../../dist/primitives/string';
import NumberResource from '../../../dist/primitives/number';

describe('CommandResource', () => {
  test('creation', async () => {
    const command = await CommandResource.$create({
      '@options': {name: {'@type': 'string'}, age: {'@type': 'number'}}
    });
    expect(command).toBeInstanceOf(CommandResource);
    const options = command.$getOptions();
    expect(options).toHaveLength(2);
    expect(options[0]).toBeInstanceOf(StringResource);
    expect(options[0].$getKey()).toBe('name');
    expect(options[1]).toBeInstanceOf(NumberResource);
    expect(options[1].$getKey()).toBe('age');
  });

  test('invocation', async () => {
    // options
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});

    const person = await Person.$extend({name: 'Manu', age: 44});
    expect(await person.formatGreetingCommand()).toBe('Hi Manu!');
    person.age++;
    expect(await person.formatGreetingCommand()).toBe('Hello Manu!');
    expect(await person.formatGreetingCommand({ageLimit: 46})).toBe('Hi Manu!');
    expect(await person.formatGreetingCommand({limit: 46})).toBe('Hi Manu!');
    await expect(person.formatGreetingCommand({ageLimit: 46}, true)).rejects.toBeInstanceOf(Error);

    // variadic command
    expect(await Person.formatWordsCommand()).toBe('');
    expect(await Person.formatWordsCommand({capitalize: false})).toBe('');
    expect(await Person.formatWordsCommand('blue')).toBe('Blue.');
    expect(await Person.formatWordsCommand('blue', {capitalize: false})).toBe('blue.');
    expect(await Person.formatWordsCommand('blue', 'yellow')).toBe('Blue, yellow.');
    expect(await Person.formatWordsCommand('blue', 'yellow', {capitalize: false})).toBe(
      'blue, yellow.'
    );

    // options inherited from parent resource
    expect(await Person.formatWordsCommand('blue', 'yellow')).toBe('Blue, yellow.');
    expect(await Person.formatWordsCommand('blue', 'yellow', {shout: true})).toBe('BLUE, YELLOW.');
  });

  test('serialization', async () => {
    expect((await CommandResource.$create()).$serialize()).toBeUndefined();
    expect((await CommandResource.$create({'@type': 'command'})).$serialize()).toEqual({
      '@type': 'command'
    });
    expect((await CommandResource.$create({'@option': {name: 'Manu'}})).$serialize()).toEqual({
      '@option': {name: 'Manu'}
    });
    expect(
      (await CommandResource.$create({'@options': {name: 'Manu', age: 44}})).$serialize()
    ).toEqual({
      '@options': {name: 'Manu', age: 44}
    });
  });
});
