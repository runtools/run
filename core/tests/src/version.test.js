import Version from '../../dist/version';

describe('Version', () => {
  test('emptiness', () => {
    expect(() => new Version()).toThrow();
    expect(() => new Version('')).toThrow();
    expect(() => new Version('1.0.0')).not.toThrow();
  });

  test('validation', () => {
    expect(() => new Version('1.0.0')).not.toThrow();
    expect(() => new Version('1.0.0.0')).toThrow();
    expect(() => new Version('^1.0.0')).toThrow();
  });

  test('serialization', () => {
    expect(new Version('1.2.3').toJSON()).toBe('1.2.3');
  });

  test('conversion', () => {
    expect('v' + new Version('1.2.3')).toBe('v1.2.3');
  });
});
