import Entity from '../src/entity';
import Attribute from '../src/attribute';

describe('Attribute', () => {
  test('is an Entity', () => {
    const attribute = new Attribute({name: 'color'});
    expect(attribute).toBeInstanceOf(Entity);
  });

  test('must have a name', () => {
    expect(() => new Attribute()).toThrow();
    expect(() => new Attribute({name: ''})).toThrow();
    expect(() => new Attribute({name: ' '})).toThrow();
    const attribute = new Attribute({name: 'color'});
    expect(attribute.name).toBe('color');
  });

  test('has a type', () => {
    const attribute = new Attribute({name: 'color', type: 'number'});
    expect(attribute.type).toBeDefined();
    expect(attribute.type.name).toBe('number');
  });

  test('has a string type by default', () => {
    const attribute = new Attribute({name: 'color'});
    expect(attribute.type).toBeDefined();
    expect(attribute.type.name).toBe('string');
  });

  test('can have a default value', () => {
    const attribute = new Attribute({name: 'color', default: 'green'});
    expect(attribute.default).toBe('green');
  });

  test('can infer its type from the default value', () => {
    const attribute = new Attribute({name: 'color', default: 123});
    expect(attribute.type.name).toBe('number');
  });
});
