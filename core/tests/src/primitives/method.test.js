import Resource from '../../../dist/resource';
import MethodResource from '../../../dist/primitives/method';
import StringResource from '../../../dist/primitives/string';
import NumberResource from '../../../dist/primitives/number';

describe('MethodResource', () => {
  test('creation', () => {
    let method = MethodResource.$create({
      $parameters: [{$name: 'name', $type: 'string'}, {$name: 'age', $type: 'number'}]
    });
    expect(method).toBeInstanceOf(MethodResource);
    expect(method.$parameters).toHaveLength(2);
    expect(method.$parameters[0]).toBeInstanceOf(StringResource);
    expect(method.$parameters[0].$name).toBe('name');
    expect(method.$parameters[1]).toBeInstanceOf(NumberResource);
    expect(method.$parameters[1].$name).toBe('age');

    method = MethodResource.$create({$parameter: {$type: 'string'}, $variadic: true});
    expect(method.$variadic).toBe(true);
  });

  test('invocation', async () => {
    const Person = Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(await Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = Person.$create({name: 'Manu'});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(await person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    await expect(person.formatGreetingMethod('Konnichiwa', 123)).rejects.toBeInstanceOf(Error);

    person = Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');

    expect(await person.formatWordsMethod()).toBe('');
    expect(await person.formatWordsMethod('blue')).toBe('Blue.');
    expect(await person.formatWordsMethod('blue', 'yellow')).toBe('Blue, yellow.');
  });

  test.skip('events', async () => {
    const person = Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
  });

  test('serialization', () => {
    expect(MethodResource.$create().$serialize()).toBeUndefined();

    expect(MethodResource.$create({$type: 'method'}).$serialize()).toEqual({$type: 'method'});

    expect(MethodResource.$create({$parameter: 1}).$serialize()).toEqual({$parameter: 1});
    expect(MethodResource.$create({$parameters: [1, 2]}).$serialize()).toEqual({
      $parameters: [1, 2]
    });

    expect(MethodResource.$create({$variadic: false}).$serialize()).toEqual({$variadic: false});
    expect(MethodResource.$create({$variadic: true}).$serialize()).toEqual({$variadic: true});

    expect(MethodResource.$create({$listen: 'before:build'}).$serialize()).toEqual({
      $listen: 'before:build'
    });
    expect(
      MethodResource.$create({$listen: ['before:build', 'after:install']}).$serialize()
    ).toEqual({$listen: ['before:build', 'after:install']});

    expect(MethodResource.$create({$emit: '*:build'}).$serialize()).toEqual({$emit: '*:build'});
  });
});
