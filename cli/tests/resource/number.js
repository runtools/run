import NumberResource from '../../src/resource/number';

describe('NumberResource', () => {
  test('can have a number value', () => {
    expect(new NumberResource().$value).toBeUndefined();
    expect(new NumberResource({$value: 0}).$value).toBe(0);
    expect(new NumberResource({$value: 1}).$value).toBe(1);
    expect(new NumberResource({$value: 123.45}).$value).toBe(123.45);
    expect(new NumberResource(-789).$value).toBe(-789);
    expect(() => new NumberResource({$value: 'hello'})).toThrow();
    expect(() => new NumberResource('hello')).toThrow();
  });

  test('is serializable', () => {
    expect(new NumberResource().$serialize()).toBeUndefined();
    expect(new NumberResource(123.45).$serialize()).toBe(123.45);
  });
});
