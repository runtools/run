import Resource from '../../src/resources';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';
import CompositeResource from '../../src/resources/composite';

describe('MethodResource', () => {
  test('can have parameters', async () => {
    const method = await Resource.$create({
      $type: 'method',
      $parameters: [{$id: 'name', $type: 'string'}, {$id: 'age', $type: 'number'}]
    });
    expect(method.$getParameters()).toHaveLength(2);
    expect(method.$getParameters()[0]).toBeInstanceOf(StringResource);
    expect(method.$getParameters()[0].$id).toBe('name');
    expect(method.$getParameters()[1]).toBeInstanceOf(NumberResource);
    expect(method.$getParameters()[1].$id).toBe('age');
  });

  test('can be invoked', async () => {
    const Person = await CompositeResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.getGreeting()).toBe('Hi Manu!');
    person.age++;
    expect(person.getGreeting()).toBe('Hello Manu!');
    expect(person.getGreeting(46)).toBe('Hi Manu!');
  });

  test('is serializable', async () => {
    expect((await Resource.$create({$type: 'method'})).$serialize()).toEqual({$type: 'method'});
    expect((await Resource.$create({$type: 'method', $parameter: 1})).$serialize()).toEqual({
      $type: 'method',
      $parameter: 1
    });
    expect((await Resource.$create({$type: 'method', $parameters: [1, 2]})).$serialize()).toEqual({
      $type: 'method',
      $parameters: [1, 2]
    });
  });
});
