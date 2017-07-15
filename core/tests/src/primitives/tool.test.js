import ToolResource from '../../../dist/primitives/tool';
import StringResource from '../../../dist/primitives/string';
import NumberResource from '../../../dist/primitives/number';

describe('ToolResource', () => {
  test('creation', async () => {
    const tool = await ToolResource.$create({
      $options: {name: {$type: 'string'}, age: {$type: 'number'}}
    });
    expect(tool).toBeInstanceOf(ToolResource);
    const options = tool.$getOptions();
    expect(options).toHaveLength(2);
    expect(options[0]).toBeInstanceOf(StringResource);
    expect(options[0].$name).toBe('name');
    expect(options[1]).toBeInstanceOf(NumberResource);
    expect(options[1].$name).toBe('age');
  });

  test('serialization', async () => {
    expect((await ToolResource.$create()).$serialize()).toBeUndefined();
    expect((await ToolResource.$create({$type: 'tool'})).$serialize()).toEqual({$type: 'tool'});
    expect((await ToolResource.$create({$option: {name: 'Manu'}})).$serialize()).toEqual({
      $option: {name: 'Manu'}
    });
    expect((await ToolResource.$create({$options: {name: 'Manu', age: 44}})).$serialize()).toEqual({
      $options: {name: 'Manu', age: 44}
    });
  });
});
