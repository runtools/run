import MacroResource from '../../src/resources/macro';
import CompositeResource from '../../src/resources/composite';

describe('MacroResource', () => {
  test('can have an expression', async () => {
    const macro = await MacroResource.$create({$expression: 'frontend deploy --verbose'});
    expect(macro).toBeInstanceOf(MacroResource);
    expect(macro.$expressions).toEqual(['frontend deploy --verbose']);
  });

  test('can be invoked', async () => {
    const Person = await CompositeResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 29});
    expect(await person.formatGreetingMacro()).toBe('Hi Manu!');
    person.age++;
    expect(await person.formatGreetingMacro()).toBe('Hello Manu!');
  });

  test('can load a resource', async () => {
    const macro = await MacroResource.$create(
      {$expression: './fixtures/person-instance'},
      {directory: __dirname}
    );
    const person = await macro.$invoke();
    expect(person).toBeInstanceOf(CompositeResource);
    expect(person.name).toBe('Manu');
  });

  test('is serializable', async () => {
    expect((await MacroResource.$create()).$serialize()).toEqual();
    expect((await MacroResource.$create({$type: 'macro'})).$serialize()).toEqual({
      $type: 'macro'
    });
    expect(
      (await MacroResource.$create({$expression: 'frontend deploy --verbose'})).$serialize()
    ).toEqual({$expression: 'frontend deploy --verbose'});
    expect(
      (await MacroResource.$create({$expressions: ['build', 'deploy']})).$serialize()
    ).toEqual({$expressions: ['build', 'deploy']});
  });
});
