import ArrayResource from '../../src/resources/array';

describe('ArrayResource', () => {
  test('can have an array value', () => {
    expect(new ArrayResource().$value).toBeUndefined();
    expect(new ArrayResource({$value: []}).$value).toEqual([]);
    expect(new ArrayResource({$value: [1, 'hi']}).$value).toEqual([1, 'hi']);
    expect(new ArrayResource([true]).$value).toEqual([true]);
    expect(() => new ArrayResource({$value: 'hello'})).toThrow();
    expect(() => new ArrayResource('hello')).toThrow();
  });

  test('can parse a string', () => {
    expect(() => new ArrayResource({$value: '[]'})).toThrow();
    expect(new ArrayResource({$value: '[]'}, {parse: true}).$value).toEqual([]);
    expect(new ArrayResource({$value: '[1, 2]'}, {parse: true}).$value).toEqual([1, 2]);
    expect(() => new ArrayResource({$value: ''}, {parse: true})).toThrow();
    expect(() => new ArrayResource({$value: '{}'}, {parse: true})).toThrow();
    expect(() => new ArrayResource({$value: 'Invalid JSON'}, {parse: true})).toThrow();
  });

  test('has an immutable value', () => {
    const array = new ArrayResource([1, 2, 3]);
    expect(array.$value).toEqual([1, 2, 3]);
    expect(() => array.$value.push(4)).toThrow();
    expect(() => {
      array.$value[0] = -1;
    }).toThrow();
    expect(array.$value[0]).toBe(1);
  });

  test('is serializable', () => {
    expect(new ArrayResource().$serialize()).toBeUndefined();
    expect(new ArrayResource(['green', 'yellow']).$serialize()).toEqual(['green', 'yellow']);
  });
});
