import Resource from '../../../dist/resource';
import MethodResource from '../../../dist/primitives/method';
import StringResource from '../../../dist/primitives/string';
import NumberResource from '../../../dist/primitives/number';

describe('MethodResource', () => {
  test('creation', async () => {
    let method = await MethodResource.$create({
      '@parameters': {name: {'@type': 'string'}, age: {'@type': 'number'}}
    });
    expect(method).toBeInstanceOf(MethodResource);
    const parameters = method.$getParameters();
    expect(parameters).toHaveLength(2);
    expect(parameters[0]).toBeInstanceOf(StringResource);
    expect(parameters[0].$getKey()).toBe('name');
    expect(parameters[1]).toBeInstanceOf(NumberResource);
    expect(parameters[1].$getKey()).toBe('age');

    method = await MethodResource.$create({
      '@parameter': {args: {'@type': 'string'}},
      '@variadic': true
    });
    expect(method.$variadic).toBe(true);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(await Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = await Person.$extend({name: 'Manu'});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(await person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    await expect(person.formatGreetingMethod('Konnichiwa', 123)).rejects.toBeInstanceOf(Error);

    person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');

    expect(await person.formatWordsMethod()).toBe('');
    expect(await person.formatWordsMethod('blue')).toBe('Blue.');
    expect(await person.formatWordsMethod('blue', 'yellow')).toBe('Blue, yellow.');
  });

  test('events', async () => {
    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
  });

  test('multiple inheritance', async () => {
    const personWithMixin = await Resource.$create(
      {'@types': ['../../fixtures/person', '../../fixtures/mixin']},
      {directory: __dirname}
    );
    expect(await personWithMixin.formatGreetingMethod()).toBe('Hello Anonymous!');
    expect(await personWithMixin.mixinMethod()).toBe('mixin-method-returned-value');
  });

  test('serialization', async () => {
    expect((await MethodResource.$create()).$serialize()).toBeUndefined();

    expect((await MethodResource.$create({'@type': 'method'})).$serialize()).toEqual({
      '@type': 'method'
    });

    expect((await MethodResource.$create({'@parameter': {a: 1}})).$serialize()).toEqual({
      '@parameter': {a: 1}
    });
    expect((await MethodResource.$create({'@parameters': {a: 1, b: 2}})).$serialize()).toEqual({
      '@parameters': {a: 1, b: 2}
    });

    expect((await MethodResource.$create({'@variadic': false})).$serialize()).toEqual({
      '@variadic': false
    });
    expect((await MethodResource.$create({'@variadic': true})).$serialize()).toEqual({
      '@variadic': true
    });

    expect((await MethodResource.$create({'@listen': 'before:build'})).$serialize()).toEqual({
      '@listen': 'before:build'
    });
    expect(
      (await MethodResource.$create({'@listen': ['before:build', 'after:install']})).$serialize()
    ).toEqual({'@listen': ['before:build', 'after:install']});

    expect((await MethodResource.$create({'@emit': '*:build'})).$serialize()).toEqual({
      '@emit': '*:build'
    });
  });
});
