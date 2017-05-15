import BooleanResource from '../../src/resource/boolean';

describe('BooleanResource', () => {
  test('can have a string value', () => {
    expect(new BooleanResource().$value).toBeUndefined();
    expect(new BooleanResource({$value: false}).$value).toBe(false);
    expect(new BooleanResource({$value: true}).$value).toBe(true);
    expect(new BooleanResource(true).$value).toBe(true);
    expect(() => new BooleanResource({$value: 1})).toThrow();
    expect(() => new BooleanResource(1)).toThrow();
  });

  test('is serializable', () => {
    expect(new BooleanResource().$serialize()).toBeUndefined();
    expect(new BooleanResource(false).$serialize()).toBe(false);
    expect(new BooleanResource(true).$serialize()).toBe(true);
  });
});
