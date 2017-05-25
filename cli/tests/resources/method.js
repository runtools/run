import MethodResource from '../../src/resources/method';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';
import CompositeResource from '../../src/resources/composite';

describe('MethodResource', () => {
  test('can have parameters', async () => {
    const method = await MethodResource.$create({
      $parameters: [{$id: 'name', $type: 'string'}, {$id: 'age', $type: 'number'}]
    });
    expect(method).toBeInstanceOf(MethodResource);
    expect(method.$getParameters()).toHaveLength(2);
    expect(method.$getParameters()[0]).toBeInstanceOf(StringResource);
    expect(method.$getParameters()[0].$id).toBe('name');
    expect(method.$getParameters()[1]).toBeInstanceOf(NumberResource);
    expect(method.$getParameters()[1].$id).toBe('age');
  });

  test('can be invoked', async () => {
    const Person = await CompositeResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu'});
    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    expect(() => person.formatGreetingMethod('Konnichiwa', true)).toThrow();
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
