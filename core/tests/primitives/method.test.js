import Resource from '../../src/resource';
import MethodResource from '../../src/primitives/method';
import StringResource from '../../src/primitives/string';
import NumberResource from '../../src/primitives/number';

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

  test('invocation', () => {
    const Person = Resource.$load('../fixtures/person', {directory: __dirname});
    expect(Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = Person.$create({name: 'Manu'});

    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    expect(() => person.formatGreetingMethod('Konnichiwa', 123)).toThrow();

    person = Resource.$load('../fixtures/person-instance', {directory: __dirname});

    expect(person.formatGreetingMethod()).toBe('Hello Manu!');

    expect(person.formatWordsMethod()).toBe('');
    expect(person.formatWordsMethod('blue')).toBe('Blue.');
    expect(person.formatWordsMethod('blue', 'yellow')).toBe('Blue, yellow.');
  });

  test('serialization', () => {
    expect(MethodResource.$create().$serialize()).toBeUndefined();
    expect(MethodResource.$create({$type: 'method'}).$serialize()).toEqual({$type: 'method'});
    expect(MethodResource.$create({$parameter: 1}).$serialize()).toEqual({$parameter: 1});
    expect(MethodResource.$create({$parameters: [1, 2]}).$serialize()).toEqual({
      $parameters: [1, 2]
    });
    expect(MethodResource.$create({$variadic: true}).$serialize()).toEqual({$variadic: true});
  });
});
