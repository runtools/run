import MethodResource from '../../src/resources/method';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';
import CompositeResource from '../../src/resources/composite';

describe('MethodResource', () => {
  test('can have parameters', async () => {
    const method = await MethodResource.$create({
      $parameters: [{$name: 'name', $type: 'string'}, {$name: 'age', $type: 'number'}]
    });
    expect(method).toBeInstanceOf(MethodResource);
    expect(method.$getParameters()).toHaveLength(2);
    expect(method.$getParameters()[0]).toBeInstanceOf(StringResource);
    expect(method.$getParameters()[0].$name).toBe('name');
    expect(method.$getParameters()[1]).toBeInstanceOf(NumberResource);
    expect(method.$getParameters()[1].$name).toBe('age');
  });

  test('can be invoked', async () => {
    const Person = await CompositeResource.$load('./fixtures/person', {directory: __dirname});
    expect(Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = Person.$instantiate({name: 'Manu'});
    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    expect(() => person.formatGreetingMethod('Konnichiwa', true)).toThrow();

    person = await CompositeResource.$load('./fixtures/person-instance', {directory: __dirname});
    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
  });

  test('is serializable', async () => {
    expect((await MethodResource.$create()).$serialize()).toEqual();
    expect((await MethodResource.$create({$type: 'method'})).$serialize()).toEqual({
      $type: 'method'
    });
    expect((await MethodResource.$create({$parameter: 1})).$serialize()).toEqual({$parameter: 1});
    expect((await MethodResource.$create({$parameters: [1, 2]})).$serialize()).toEqual({
      $parameters: [1, 2]
    });
  });
});
