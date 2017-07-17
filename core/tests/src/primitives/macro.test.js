import Resource from '../../../dist/resource';
import MacroResource from '../../../dist/primitives/macro';

describe('MacroResource', () => {
  test('creation', async () => {
    const macro = await MacroResource.$create({'@expression': 'frontend deploy --verbose'});
    expect(macro).toBeInstanceOf(MacroResource);
    expect(macro.$expressions).toEqual(['frontend deploy --verbose']);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    let person = await Person.$create({name: 'Manu', age: 29});
    expect(await person.formatGreetingMacro()).toBe('Hi Manu!');
    expect(await person.formatGreetingMacro({ageLimit: 29})).toBe('Hello Manu!');
    person.age++;
    expect(await person.formatGreetingMacro()).toBe('Hello Manu!');
    expect(await person.formatGreetingMacro({ageLimit: 31})).toBe('Hi Manu!');

    person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
    expect(await person.formatWordsMacro('blue')).toBe('Blue.');
    expect(await person.formatWordsMacro('blue', {capitalize: false})).toBe('blue.');
  });

  test('resource loading', async () => {
    const macro = await MacroResource.$create(
      {'@expression': '../../fixtures/person-instance'},
      {directory: __dirname}
    );
    const person = await macro.$invoke();
    expect(person).toBeInstanceOf(Resource);
    expect(person.name).toBe('Manu');
  });

  test('serialization', async () => {
    expect((await MacroResource.$create()).$serialize()).toBeUndefined();
    expect((await MacroResource.$create({'@type': 'macro'})).$serialize()).toEqual({
      '@type': 'macro'
    });
    expect(
      (await MacroResource.$create({'@expression': 'frontend deploy --verbose'})).$serialize()
    ).toEqual({
      '@expression': 'frontend deploy --verbose'
    });
    expect(
      (await MacroResource.$create({'@expressions': ['build', 'deploy']})).$serialize()
    ).toEqual({
      '@expressions': ['build', 'deploy']
    });
  });
});
