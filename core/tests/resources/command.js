import {createResource, loadResource} from '../../src/resources';
import CommandResource from '../../src/resources/command';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';

describe('CommandResource', () => {
  test('can have options', async () => {
    const command = await createResource({
      $type: 'command',
      $options: {name: {$type: 'string'}, age: {$type: 'number'}}
    });
    expect(command).toBeInstanceOf(CommandResource);
    expect(command.$getOptions()).toHaveLength(2);
    expect(command.$getOptions()[0]).toBeInstanceOf(StringResource);
    expect(command.$getOptions()[0].$name).toBe('name');
    expect(command.$getOptions()[1]).toBeInstanceOf(NumberResource);
    expect(command.$getOptions()[1].$name).toBe('age');
  });

  test('can be invoked', async () => {
    const Person = await loadResource('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.formatGreetingCommand()).toBe('Hi Manu!');
    person.age++;
    expect(person.formatGreetingCommand()).toBe('Hello Manu!');
    expect(person.formatGreetingCommand({ageLimit: 46})).toBe('Hi Manu!');
    expect(() => person.formatGreetingCommand({ageLimit: 46}, true)).toThrow();
  });

  test('is serializable', async () => {
    expect((await createResource({$type: 'command'})).$serialize()).toEqual({
      $type: 'command'
    });
    expect(
      (await createResource({$type: 'command', $option: {name: 'Manu'}})).$serialize()
    ).toEqual({
      $type: 'command',
      $option: {name: 'Manu'}
    });
    expect(
      (await createResource({
        $type: 'command',
        $options: {name: 'Manu', age: 44}
      })).$serialize()
    ).toEqual({$type: 'command', $options: {name: 'Manu', age: 44}});
  });
});
