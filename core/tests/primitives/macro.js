import Resource from '../../src/resource';
import MacroResource from '../../src/primitives/macro';

describe('MacroResource', () => {
  test('creation', () => {
    const macro = MacroResource.$create({$expression: 'frontend deploy --verbose'});
    expect(macro).toBeInstanceOf(MacroResource);
    expect(macro.$expressions).toEqual(['frontend deploy --verbose']);
  });

  test('invocation', async () => {
    const Person = Resource.$load('../fixtures/person', {directory: __dirname});
    let person = Person.$create({name: 'Manu', age: 29});
    expect(await person.formatGreetingMacro()).toBe('Hi Manu!');
    person.age++;
    expect(await person.formatGreetingMacro()).toBe('Hello Manu!');

    person = Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(await person.formatWordsMacro()).toBe('blue, green.');
  });

  test('resource loading', async () => {
    const macro = MacroResource.$create(
      {$expression: '../fixtures/person-instance'},
      {directory: __dirname}
    );
    const person = await macro.$invoke();
    expect(person).toBeInstanceOf(Resource);
    expect(person.name).toBe('Manu');
  });

  test('serialization', () => {
    expect(MacroResource.$create().$serialize()).toBeUndefined();
    expect(MacroResource.$create({$type: 'macro'}).$serialize()).toEqual({$type: 'macro'});
    expect(MacroResource.$create({$expression: 'frontend deploy --verbose'}).$serialize()).toEqual({
      $expression: 'frontend deploy --verbose'
    });
    expect(MacroResource.$create({$expressions: ['build', 'deploy']}).$serialize()).toEqual({
      $expressions: ['build', 'deploy']
    });
  });
});
