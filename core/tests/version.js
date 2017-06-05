import Version from '../src/version';

describe('Version', () => {
  test('cannot be empty', () => {
    expect(() => new Version()).toThrow();
    expect(() => new Version('')).toThrow();
    expect(() => new Version('1.0.0')).not.toThrow();
  });

  test('must be valid', () => {
    expect(() => new Version('1.0.0')).not.toThrow();
    expect(() => new Version('1.0.0.0')).toThrow();
    expect(() => new Version('^1.0.0')).toThrow();
  });

  test('is serializable', () => {
    expect(new Version('1.2.3').toJSON()).toBe('1.2.3');
  });

  test('can be converted to a string', () => {
    expect('v' + new Version('1.2.3')).toBe('v1.2.3');
  });
});
