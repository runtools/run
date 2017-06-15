import {createResource, loadResource} from '../../src/resources';
import MacroResource from '../../src/resources/macro';
import CompositeResource from '../../src/resources/composite';

describe('MacroResource', () => {
  test('can have an expression', async () => {
    const macro = await createResource({
      $type: 'macro',
      $expression: 'frontend deploy --verbose'
    });
    expect(macro).toBeInstanceOf(MacroResource);
    expect(macro.$expressions).toEqual(['frontend deploy --verbose']);
  });

  test('can be invoked', async () => {
    const Person = await loadResource('./fixtures/person', {directory: __dirname});
    let person = Person.$instantiate({name: 'Manu', age: 29});
    expect(await person.formatGreetingMacro()).toBe('Hi Manu!');
    person.age++;
    expect(await person.formatGreetingMacro()).toBe('Hello Manu!');

    person = await loadResource('./fixtures/person-instance', {directory: __dirname});
    expect(await person.formatWordsMacro()).toBe('blue, green.');
  });

  test('can load a resource', async () => {
    const macro = await createResource(
      {$type: 'macro', $expression: './fixtures/person-instance'},
      {directory: __dirname}
    );
    const person = await macro.$invoke();
    expect(person).toBeInstanceOf(CompositeResource);
    expect(person.name).toBe('Manu');
  });

  test('is serializable', async () => {
    expect((await createResource({$type: 'macro'})).$serialize()).toEqual({
      $type: 'macro'
    });
    expect(
      (await createResource({
        $type: 'macro',
        $expression: 'frontend deploy --verbose'
      })).$serialize()
    ).toEqual({$type: 'macro', $expression: 'frontend deploy --verbose'});
    expect(
      (await createResource({
        $type: 'macro',
        $expressions: ['build', 'deploy']
      })).$serialize()
    ).toEqual({$type: 'macro', $expressions: ['build', 'deploy']});
  });
});
