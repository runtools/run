import Resource from '../../../dist/resource';
import MacroResource from '../../../dist/primitives/macro';

describe('MacroResource', () => {
  test('creation', async () => {
    const macro = await MacroResource.$create({'@expression': 'frontend deploy --@verbose'});
    expect(macro).toBeInstanceOf(MacroResource);
    expect(macro.$expression).toEqual(['frontend deploy --@verbose']);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    const person = await Person.$extend({name: 'Manu'});
    expect(await person.formatGreetingMacro()).toBe('Hi Manu!');
    expect(await person.formatGreetingMacro({verb: 'Bonjour'})).toBe('Bonjour Manu!');
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
      (await MacroResource.$create({'@expression': 'frontend deploy --@verbose'})).$serialize()
    ).toEqual({'@expression': 'frontend deploy --@verbose'});
    expect(
      (await MacroResource.$create({'@expression': ['build', 'deploy']})).$serialize()
    ).toEqual({'@expression': ['build', 'deploy']});
  });
});
