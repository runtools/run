import {createRuntime} from '../../src/runtimes';
import NodeRuntime from '../../src/runtimes/node';

describe('Runtime', () => {
  test('can create a Node runtime', () => {
    const runtime1 = createRuntime('node');
    expect(runtime1).toBeInstanceOf(NodeRuntime);
    expect(runtime1.name).toBe('node');
    expect(runtime1.version.toString()).toBe('');

    const runtime2 = createRuntime('node@>=6.0.0 !6.6.6');
    expect(runtime2).toBeInstanceOf(NodeRuntime);
    expect(runtime2.name).toBe('node');
    expect(runtime2.version.toString()).toBe('>=6.0.0 !6.6.6');

    expect(() => createRuntime('nooode')).toThrow();
    expect(() => createRuntime('node@1.2.3.4')).toThrow();
  });

  test('is serializable', () => {
    expect(createRuntime('node').toJSON()).toBe('node');
    expect(createRuntime('node@>=6.0.0').toJSON()).toBe('node@>=6.0.0');
  });
});
