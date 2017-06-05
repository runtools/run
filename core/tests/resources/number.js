import NumberResource from '../../src/resources/number';

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

  test('can parse a string', () => {
    expect(() => new NumberResource({$value: '123'})).toThrow();
    expect(new NumberResource({$value: '123'}, {parse: true}).$value).toBe(123);
    expect(new NumberResource({$value: '0.999'}, {parse: true}).$value).toBe(0.999);
    expect(new NumberResource({$value: '-3.333'}, {parse: true}).$value).toBe(-3.333);
    expect(() => new NumberResource({$value: ''}, {parse: true})).toThrow();
    expect(() => new NumberResource({$value: 'two'}, {parse: true})).toThrow();
  });

  test('is serializable', () => {
    expect(new NumberResource().$serialize()).toBeUndefined();
    expect(new NumberResource(123.45).$serialize()).toBe(123.45);
  });
});
