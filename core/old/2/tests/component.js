import Component from '../src/component';
import Property from '../src/property';

describe('Component', () => {
  test('provides an identifier', () => {
    expect(new Component({name: 'hello'}).toIdentifier()).toBe('hello');
    expect(new Component({name: 'hello'}, {file: '/path/to/resource.json5'}).toIdentifier()).toBe(
      'hello (/path/to/resource.json5)'
    );
  });

  test('can have properties', () => {
    const method = new Component({properties: ['firstName', 'lastName']});
    expect(method.properties).toHaveLength(2);
    const prop1 = method.properties[0];
    expect(prop1).toBeInstanceOf(Property);
    expect(prop1.name).toBe('firstName');
    const prop2 = method.properties[1];
    expect(prop2).toBeInstanceOf(Property);
    expect(prop2.name).toBe('lastName');
  });

  test('can extend other components', () => {
    expect(new Component().is).toBeUndefined();
    expect(new Component({is: 'website'}).is).toBe('website');
    expect(new Component({is: ['awesome', 'website']}).is).toEqual(['awesome', 'website']);
  });

  test('is serializable', () => {
    // TODO
  });
});
