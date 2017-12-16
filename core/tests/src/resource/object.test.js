import ObjectResource from '../../../dist/resource/object';

describe('ObjectResource', () => {
  test('creation', async () => {
    expect(await ObjectResource.$create()).toBeInstanceOf(ObjectResource);
    expect((await ObjectResource.$create()).$value).toBeUndefined();
    expect((await ObjectResource.$create({})).$value).toEqual({});
    expect((await ObjectResource.$create({name: 'Manu'})).$value).toEqual({name: 'Manu'});
    expect((await ObjectResource.$create({'@type': 'object', '@value': {}})).$value).toEqual({});
    expect((await ObjectResource.$create({'@type': 'object', '@value': {name: 'Manu'}})).$value).toEqual({
      name: 'Manu'
    });
    expect((await ObjectResource.$create({
      '@type': 'object',
      '@value': {'@load': 'abc', '@xyz': 123}
    })).$value).toEqual({
      '@load': 'abc',
      '@xyz': 123
    });
    await expect(ObjectResource.$create('hello')).rejects.toBeInstanceOf(Error);
    await expect(ObjectResource.$create({'@value': 123})).rejects.toBeInstanceOf(Error);
    await expect(ObjectResource.$create({'@type': 'object', '@value': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await ObjectResource.$create()).$default).toBeUndefined();
    expect((await ObjectResource.$create()).$value).toBeUndefined();
    expect((await ObjectResource.$create({'@default': {}})).$default).toEqual({});
    expect((await ObjectResource.$create({'@default': {}})).$value).toEqual({});
    expect((await ObjectResource.$create({'@value': {name: 'Manu'}, '@default': {}})).$default).toEqual({});
    expect((await ObjectResource.$create({'@value': {name: 'Manu'}, '@default': {}})).$value).toEqual({name: 'Manu'});
    await expect(ObjectResource.$create({'@default': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('immutability', async () => {
    const obj = await ObjectResource.$create({name: 'Manu'});
    expect(obj.$value).toEqual({name: 'Manu'});
    expect(() => {
      obj.$value.name = 'Manuel';
    }).toThrow();
    expect(obj.$value.name).toBe('Manu');
    expect(() => {
      obj.$value.age = 44;
    }).toThrow();
    expect(obj.$value.age).toBeUndefined();

    const obj2 = await ObjectResource.$create({'@default': {name: 'Manu'}});
    expect(obj2.$default).toEqual({name: 'Manu'});
    expect(obj2.$value).toEqual({name: 'Manu'});
    expect(() => {
      obj2.$default.name = 'Manuel';
    }).toThrow();
    expect(() => {
      obj2.$value.name = 'Manuel';
    }).toThrow();
    expect(obj2.$default.name).toBe('Manu');
    expect(obj2.$value.name).toBe('Manu');
    expect(() => {
      obj2.$default.age = 44;
    }).toThrow();
    expect(() => {
      obj2.$value.age = 44;
    }).toThrow();
    expect(obj2.$default.age).toBeUndefined();
    expect(obj2.$value.age).toBeUndefined();
  });

  test('serialization', async () => {
    expect((await ObjectResource.$create()).$serialize()).toBeUndefined();
    expect((await ObjectResource.$create({})).$serialize()).toEqual({});
    expect((await ObjectResource.$create({name: 'Manu', age: 44})).$serialize()).toEqual({
      name: 'Manu',
      age: 44
    });
    expect((await ObjectResource.$create({'@type': 'object', '@value': {name: 'Manu'}})).$serialize()).toEqual({'@type': 'object', '@value': {name: 'Manu'}});
    expect((await ObjectResource.$create({'@default': {name: 'Manu'}})).$serialize()).toEqual({
      '@default': {name: 'Manu'}
    });
  });
});
