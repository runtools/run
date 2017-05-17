import Runtime from '../../src/runtimes';
import NodeRuntime from '../../src/runtimes/node';

describe('Runtime', () => {
  test('can be constructed from a factory function', () => {
    const runtime1 = Runtime.create('node');
    expect(runtime1).toBeInstanceOf(NodeRuntime);
    expect(runtime1.name).toBe('node');
    expect(runtime1.version.toString()).toBe('');

    const runtime2 = Runtime.create('node@>=6.0.0 !6.6.6');
    expect(runtime2).toBeInstanceOf(NodeRuntime);
    expect(runtime2.name).toBe('node');
    expect(runtime2.version.toString()).toBe('>=6.0.0 !6.6.6');

    expect(() => Runtime.create('nooode')).toThrow();
    expect(() => Runtime.create('node@1.2.3.4')).toThrow();
  });

  test('is serializable', () => {
    expect(Runtime.create('node').toJSON()).toBe('node');
    expect(Runtime.create('node@>=6.0.0').toJSON()).toBe('node@>=6.0.0');
  });
});
