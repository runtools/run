import BooleanResource from '../../../dist/primitives/boolean';

describe('BooleanResource', () => {
  test('creation', () => {
    expect(BooleanResource.$create()).toBeInstanceOf(BooleanResource);
    expect(BooleanResource.$create().$value).toBeUndefined();
    expect(BooleanResource.$create({$value: false}).$value).toBe(false);
    expect(BooleanResource.$create({$value: true}).$value).toBe(true);
    expect(BooleanResource.$create(true).$value).toBe(true);
    expect(() => BooleanResource.$create({$value: 1})).toThrow();
    expect(() => BooleanResource.$create(1)).toThrow();
  });

  test('parsing', () => {
    expect(() => BooleanResource.$create('true')).toThrow();
    expect(BooleanResource.$create('true', {parse: true}).$value).toBe(true);
    expect(BooleanResource.$create('false', {parse: true}).$value).toBe(false);
    expect(BooleanResource.$create('TRUE', {parse: true}).$value).toBe(true);
    expect(BooleanResource.$create('1', {parse: true}).$value).toBe(true);
    expect(BooleanResource.$create('yes', {parse: true}).$value).toBe(true);
    expect(BooleanResource.$create('on', {parse: true}).$value).toBe(true);
    expect(BooleanResource.$create('FALSE', {parse: true}).$value).toBe(false);
    expect(BooleanResource.$create('0', {parse: true}).$value).toBe(false);
    expect(BooleanResource.$create('no', {parse: true}).$value).toBe(false);
    expect(BooleanResource.$create('off', {parse: true}).$value).toBe(false);
    expect(() => BooleanResource.$create('', {parse: true})).toThrow();
    expect(() => BooleanResource.$create('3', {parse: true})).toThrow();
    expect(() => BooleanResource.$create('faux', {parse: true})).toThrow();
  });

  test('serialization', () => {
    expect(BooleanResource.$create().$serialize()).toBeUndefined();
    expect(BooleanResource.$create(false).$serialize()).toBe(false);
    expect(BooleanResource.$create(true).$serialize()).toBe(true);
  });
});
