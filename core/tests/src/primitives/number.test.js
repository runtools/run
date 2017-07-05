import NumberResource from '../../../dist/primitives/number';

describe('NumberResource', () => {
  test('creation', () => {
    expect(NumberResource.$create()).toBeInstanceOf(NumberResource);
    expect(NumberResource.$create().$value).toBeUndefined();
    expect(NumberResource.$create({$value: 0}).$value).toBe(0);
    expect(NumberResource.$create({$value: 1}).$value).toBe(1);
    expect(NumberResource.$create({$value: 123.45}).$value).toBe(123.45);
    expect(NumberResource.$create(-789).$value).toBe(-789);
    expect(() => NumberResource.$create({$value: 'hello'})).toThrow();
    expect(() => NumberResource.$create('hello')).toThrow();
  });

  test('parsing', () => {
    expect(() => NumberResource.$create('123')).toThrow();
    expect(NumberResource.$create('123', {parse: true}).$value).toBe(123);
    expect(NumberResource.$create('0.999', {parse: true}).$value).toBe(0.999);
    expect(NumberResource.$create('-3.333', {parse: true}).$value).toBe(-3.333);
    expect(() => NumberResource.$create('', {parse: true})).toThrow();
    expect(() => NumberResource.$create('two', {parse: true})).toThrow();
  });

  test('serialization', () => {
    expect(NumberResource.$create().$serialize()).toBeUndefined();
    expect(NumberResource.$create(123.45).$serialize()).toBe(123.45);
  });
});
