import Runtime from '../../../dist/cjs/runtime';

describe('Runtime', () => {
  test('instantiation', () => {
    const runtime1 = new Runtime('node');
    expect(runtime1.name).toBe('node');
    expect(runtime1.version.toString()).toBe('');

    const runtime2 = new Runtime('node#>=6.0.0,!6.6.6');
    expect(runtime2.name).toBe('node');
    expect(runtime2.version.toString()).toBe('>=6.0.0,!6.6.6');

    expect(() => new Runtime('node#1.2.3.4')).toThrow();
  });

  test('serialization', () => {
    expect(new Runtime('node').toJSON()).toBe('node');
    expect(new Runtime('node#>=6.0.0').toJSON()).toBe('node#>=6.0.0');
  });
});
