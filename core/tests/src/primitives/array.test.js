import ArrayResource from '../../../dist/primitives/array';

describe('ArrayResource', () => {
  test('creation', async () => {
    expect(await ArrayResource.$create()).toBeInstanceOf(ArrayResource);
    expect((await ArrayResource.$create()).$value).toBeUndefined();
    expect((await ArrayResource.$create({$value: []})).$value).toEqual([]);
    expect((await ArrayResource.$create({$value: [1, 'hi']})).$value).toEqual([1, 'hi']);
    expect((await ArrayResource.$create([true])).$value).toEqual([true]);
    await expect(ArrayResource.$create({$value: 'hello'})).rejects.toBeInstanceOf(Error);
    await expect(ArrayResource.$create('hello')).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    await expect(ArrayResource.$create('[]')).rejects.toBeInstanceOf(Error);
    expect((await ArrayResource.$create('[]', {parse: true})).$value).toEqual([]);
    expect((await ArrayResource.$create('[1, 2]', {parse: true})).$value).toEqual([1, 2]);
    await expect(ArrayResource.$create('', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(ArrayResource.$create('{}', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(ArrayResource.$create('Invalid JSON', {parse: true})).rejects.toBeInstanceOf(
      Error
    );
  });

  test('immutability', async () => {
    const array = await ArrayResource.$create([1, 2, 3]);
    expect(array.$value).toEqual([1, 2, 3]);
    expect(() => array.$value.push(4)).toThrow();
    expect(() => {
      array.$value[0] = -1;
    }).toThrow();
    expect(array.$value[0]).toBe(1);
  });

  test('serialization', async () => {
    expect((await ArrayResource.$create()).$serialize()).toBeUndefined();
    expect((await ArrayResource.$create(['green', 'yellow'])).$serialize()).toEqual([
      'green',
      'yellow'
    ]);
  });
});
