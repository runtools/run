import Resource from '../../../dist/resource';

describe('ObjectResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'object'})).$getType()).toBe('object');
    expect((await Resource.$create({'@value': {}})).$getType()).toBe('object');
    expect((await Resource.$create({'@type': 'object'})).$value).toBeUndefined();
    expect((await Resource.$create({'@type': 'object', '@value': {}})).$value).toEqual({});
    expect((await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}})).$value).toEqual({
      name: 'Manu'
    });
    expect((await Resource.$create({
      '@type': 'object',
      '@value': {'@load': 'abc', '@xyz': 123}
    })).$value).toEqual({
      '@load': 'abc',
      '@xyz': 123
    });
    await expect(Resource.$create({'@type': 'object', '@value': 123})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@type': 'object', '@value': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await Resource.$create({'@default': {}})).$getType()).toBe('object');
    expect((await Resource.$create({'@type': 'object'})).$default).toBeUndefined();
    expect((await Resource.$create({'@type': 'object'})).$value).toBeUndefined();
    expect((await Resource.$create({'@type': 'object', '@default': {}})).$default).toEqual({});
    expect((await Resource.$create({'@type': 'object', '@default': {}})).$value).toEqual({});
    expect((await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}, '@default': {}}))
      .$default).toEqual({});
    expect((await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}, '@default': {}})).$value).toEqual({
      name: 'Manu'
    });
    await expect(Resource.$create({'@type': 'object', '@default': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('immutability', async () => {
    const obj = await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}});
    expect(obj.$value).toEqual({name: 'Manu'});
    expect(() => {
      obj.$value.name = 'Manuel';
    }).toThrow();
    expect(obj.$value.name).toBe('Manu');
    expect(() => {
      obj.$value.age = 44;
    }).toThrow();
    expect(obj.$value.age).toBeUndefined();

    const obj2 = await Resource.$create({'@type': 'object', '@default': {name: 'Manu'}});
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
    expect((await Resource.$create({'@type': 'object'})).$serialize()).toEqual({'@type': 'object'});
    expect((await Resource.$create({'@value': {}})).$serialize()).toEqual({});
    expect((await Resource.$create({'@type': 'object', '@value': {name: 'Manu', age: 44}})).$serialize()).toEqual({'@type': 'object', '@value': {name: 'Manu', age: 44}});
    expect((await Resource.$create({'@type': 'object', '@default': {name: 'Manu'}})).$serialize()).toEqual({
      '@type': 'object',
      '@default': {name: 'Manu'}
    });
  });
});
