import BooleanResource from '../../src/primitives/boolean';

describe('BooleanResource', () => {
  test('creation', () => {
    expect(new BooleanResource().$value).toBeUndefined();
    expect(new BooleanResource({$value: false}).$value).toBe(false);
    expect(new BooleanResource({$value: true}).$value).toBe(true);
    expect(new BooleanResource(true).$value).toBe(true);
    expect(() => new BooleanResource({$value: 1})).toThrow();
    expect(() => new BooleanResource(1)).toThrow();
  });

  test('parsing', () => {
    expect(() => new BooleanResource({$value: 'true'})).toThrow();
    expect(new BooleanResource({$value: 'true'}, {parse: true}).$value).toBe(true);
    expect(new BooleanResource({$value: 'false'}, {parse: true}).$value).toBe(false);
    expect(new BooleanResource({$value: 'TRUE'}, {parse: true}).$value).toBe(true);
    expect(new BooleanResource({$value: '1'}, {parse: true}).$value).toBe(true);
    expect(new BooleanResource({$value: 'yes'}, {parse: true}).$value).toBe(true);
    expect(new BooleanResource({$value: 'on'}, {parse: true}).$value).toBe(true);
    expect(new BooleanResource({$value: 'FALSE'}, {parse: true}).$value).toBe(false);
    expect(new BooleanResource({$value: '0'}, {parse: true}).$value).toBe(false);
    expect(new BooleanResource({$value: 'no'}, {parse: true}).$value).toBe(false);
    expect(new BooleanResource({$value: 'off'}, {parse: true}).$value).toBe(false);
    expect(() => new BooleanResource({$value: ''}, {parse: true})).toThrow();
    expect(() => new BooleanResource({$value: '3'}, {parse: true})).toThrow();
    expect(() => new BooleanResource({$value: 'faux'}, {parse: true})).toThrow();
  });

  test('serialization', () => {
    expect(new BooleanResource().$serialize()).toBeUndefined();
    expect(new BooleanResource(false).$serialize()).toBe(false);
    expect(new BooleanResource(true).$serialize()).toBe(true);
  });
});
