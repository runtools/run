import Resource from '../../../dist/resource';

describe('ArrayResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'array'})).$getType()).toBe('array');
    expect((await Resource.$create({'@value': []})).$getType()).toBe('array');
    expect((await Resource.$create({'@type': 'array'})).$value).toBeUndefined();
    expect((await Resource.$create({'@value': []})).$value).toEqual([]);
    expect((await Resource.$create({'@value': [1, 'hi']})).$value).toEqual([1, 'hi']);
    expect((await Resource.$create([true])).$value).toEqual([true]);
    await expect(Resource.$create({'@type': 'array', '@value': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await Resource.$create({'@type': 'array'})).$default).toBeUndefined();
    expect((await Resource.$create({'@type': 'array'})).$value).toBeUndefined();
    expect((await Resource.$create({'@default': []})).$default).toEqual([]);
    expect((await Resource.$create({'@default': []})).$value).toEqual([]);
    expect((await Resource.$create({'@value': [1], '@default': []})).$default).toEqual([]);
    expect((await Resource.$create({'@value': [1], '@default': []})).$value).toEqual([1]);
    await expect(Resource.$create({'@type': 'array', '@default': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    const array = await Resource.$create({'@type': 'array'});
    expect((await array.$extend(undefined, {parse: true})).$value).toBeUndefined();
    expect((await array.$extend('', {parse: true})).$value).toEqual([]);
    expect((await array.$extend('a', {parse: true})).$value).toEqual(['a']);
    expect((await array.$extend('123', {parse: true})).$value).toEqual(['123']);
    expect((await array.$extend('a,b', {parse: true})).$value).toEqual(['a,b']);
    await expect(array.$extend('a', {parse: false})).rejects.toBeInstanceOf(Error);
  });

  test('immutability', async () => {
    const array = await Resource.$create([1, 2, 3]);
    expect(array.$value).toEqual([1, 2, 3]);
    expect(() => array.$value.push(4)).toThrow();
    expect(() => {
      array.$value[0] = -1;
    }).toThrow();
    expect(array.$value[0]).toBe(1);

    const array2 = await Resource.$create({'@default': ['a', 'b', 'c']});
    expect(array2.$default).toEqual(['a', 'b', 'c']);
    expect(array2.$value).toEqual(['a', 'b', 'c']);
    expect(() => array2.$default.push(4)).toThrow();
    expect(() => array2.$value.push(4)).toThrow();
    expect(() => {
      array2.$default[0] = -1;
    }).toThrow();
    expect(() => {
      array2.$default[0] = -1;
    }).toThrow();
    expect(array2.$default[0]).toBe('a');
    expect(array2.$value[0]).toBe('a');
  });

  test('serialization', async () => {
    expect((await Resource.$create(['green', 'yellow'])).$serialize()).toEqual(['green', 'yellow']);
    expect((await Resource.$create({'@default': [123]})).$serialize()).toEqual({
      '@default': [123]
    });
  });
});
