import {createResource, loadResource} from '../../src/resources';
import MethodResource from '../../src/resources/method';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';

describe('MethodResource', () => {
  test('can have parameters', async () => {
    const method = await createResource({
      $type: 'method',
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
    const Person = await loadResource('./fixtures/person', {directory: __dirname});
    expect(Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = Person.$instantiate({name: 'Manu'});
    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(person.formatGreetingMethod('Konnichiwa')).toBe('Konnichiwa Manu!');
    expect(() => person.formatGreetingMethod('Konnichiwa', true)).toThrow();

    person = await loadResource('./fixtures/person-instance', {directory: __dirname});
    expect(person.formatGreetingMethod()).toBe('Hello Manu!');
  });

  test('is serializable', async () => {
    expect((await createResource({$type: 'method'})).$serialize()).toEqual({
      $type: 'method'
    });
    expect(
      (await createResource({
        $type: 'method',
        $parameter: 1
      })).$serialize()
    ).toEqual({
      $type: 'method',
      $parameter: 1
    });
    expect(
      (await createResource({
        $type: 'method',
        $parameters: [1, 2]
      })).$serialize()
    ).toEqual({
      $type: 'method',
      $parameters: [1, 2]
    });
  });
});
