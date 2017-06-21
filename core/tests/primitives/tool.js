import ToolResource from '../../src/primitives/tool';
import StringResource from '../../src/primitives/string';
import NumberResource from '../../src/primitives/number';

describe('ToolResource', () => {
  test('creation', () => {
    const tool = ToolResource.$create({
      $options: {name: {$type: 'string'}, age: {$type: 'number'}}
    });
    expect(tool).toBeInstanceOf(ToolResource);
    expect(tool.$options).toHaveLength(2);
    expect(tool.$options[0]).toBeInstanceOf(StringResource);
    expect(tool.$options[0].$name).toBe('name');
    expect(tool.$options[1]).toBeInstanceOf(NumberResource);
    expect(tool.$options[1].$name).toBe('age');
  });

  test('serialization', () => {
    expect(ToolResource.$create().$serialize()).toBeUndefined();
    expect(ToolResource.$create({$type: 'tool'}).$serialize()).toEqual({$type: 'tool'});
    expect(ToolResource.$create({$option: {name: 'Manu'}}).$serialize()).toEqual({
      $option: {name: 'Manu'}
    });
    expect(ToolResource.$create({$options: {name: 'Manu', age: 44}}).$serialize()).toEqual({
      $options: {name: 'Manu', age: 44}
    });
  });
});
