import ArrayResource from '../../src/primitives/array';

describe('ArrayResource', () => {
  test('creation', () => {
    expect(ArrayResource.$create()).toBeInstanceOf(ArrayResource);
    expect(ArrayResource.$create().$value).toBeUndefined();
    expect(ArrayResource.$create({$value: []}).$value).toEqual([]);
    expect(ArrayResource.$create({$value: [1, 'hi']}).$value).toEqual([1, 'hi']);
    expect(ArrayResource.$create([true]).$value).toEqual([true]);
    expect(() => ArrayResource.$create({$value: 'hello'})).toThrow();
    expect(() => ArrayResource.$create('hello')).toThrow();
  });

  test('parsing', () => {
    expect(() => ArrayResource.$create('[]')).toThrow();
    expect(ArrayResource.$create('[]', {parse: true}).$value).toEqual([]);
    expect(ArrayResource.$create('[1, 2]', {parse: true}).$value).toEqual([1, 2]);
    expect(() => ArrayResource.$create('', {parse: true})).toThrow();
    expect(() => ArrayResource.$create('{}', {parse: true})).toThrow();
    expect(() => ArrayResource.$create('Invalid JSON', {parse: true})).toThrow();
  });

  test('immutability', () => {
    const array = ArrayResource.$create([1, 2, 3]);
    expect(array.$value).toEqual([1, 2, 3]);
    expect(() => array.$value.push(4)).toThrow();
    expect(() => {
      array.$value[0] = -1;
    }).toThrow();
    expect(array.$value[0]).toBe(1);
  });

  test('serialization', () => {
    expect(ArrayResource.$create().$serialize()).toBeUndefined();
    expect(ArrayResource.$create(['green', 'yellow']).$serialize()).toEqual(['green', 'yellow']);
  });
});
