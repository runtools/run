import ArrayResource from '../../../dist/resource/array';

describe('ArrayResource', () => {
  test('creation', async () => {
    expect(await ArrayResource.$create()).toBeInstanceOf(ArrayResource);
    expect((await ArrayResource.$create()).$value).toBeUndefined();
    expect((await ArrayResource.$create({'@value': []})).$value).toEqual([]);
    expect((await ArrayResource.$create({'@value': [1, 'hi']})).$value).toEqual([1, 'hi']);
    expect((await ArrayResource.$create([true])).$value).toEqual([true]);
    await expect(ArrayResource.$create({'@value': 'hello'})).rejects.toBeInstanceOf(Error);
    await expect(ArrayResource.$create('hello')).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await ArrayResource.$create()).$default).toBeUndefined();
    expect((await ArrayResource.$create()).$value).toBeUndefined();
    expect((await ArrayResource.$create({'@default': []})).$default).toEqual([]);
    expect((await ArrayResource.$create({'@default': []})).$value).toEqual([]);
    expect((await ArrayResource.$create({'@value': [1], '@default': []})).$default).toEqual([]);
    expect((await ArrayResource.$create({'@value': [1], '@default': []})).$value).toEqual([1]);
    await expect(ArrayResource.$create({'@default': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    await expect(ArrayResource.$create('a')).rejects.toBeInstanceOf(Error);
    expect((await ArrayResource.$create('', {parse: true})).$value).toEqual([]);
    expect((await ArrayResource.$create('a', {parse: true})).$value).toEqual(['a']);
    expect((await ArrayResource.$create('123', {parse: true})).$value).toEqual(['123']);
    expect((await ArrayResource.$create('a,b', {parse: true})).$value).toEqual(['a', 'b']);
  });

  test('immutability', async () => {
    const array = await ArrayResource.$create([1, 2, 3]);
    expect(array.$value).toEqual([1, 2, 3]);
    expect(() => array.$value.push(4)).toThrow();
    expect(() => {
      array.$value[0] = -1;
    }).toThrow();
    expect(array.$value[0]).toBe(1);

    const array2 = await ArrayResource.$create({'@default': ['a', 'b', 'c']});
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
    expect((await ArrayResource.$create()).$serialize()).toBeUndefined();
    expect((await ArrayResource.$create(['green', 'yellow'])).$serialize()).toEqual([
      'green',
      'yellow'
    ]);
    expect((await ArrayResource.$create({'@default': [123]})).$serialize()).toEqual({
      '@default': [123]
    });
  });
});
