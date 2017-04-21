import {toJSONDeep} from 'run-common';

import ConfigurableMixin from '../src/configurable';
import Option from '../src/option';

class Configurable extends ConfigurableMixin(Object) {}

describe('Configurable', () => {
  test('can have options constructed from an array', () => {
    const configurable = new Configurable({options: ['color', 'size']});
    expect(configurable.options).toHaveLength(2);
    const option1 = configurable.options[0];
    expect(option1).toBeInstanceOf(Option);
    expect(option1.name).toBe('color');
    const option2 = configurable.options[1];
    expect(option2).toBeInstanceOf(Option);
    expect(option2.name).toBe('size');
  });

  test('can have options constructed from an object', () => {
    const configurable = new Configurable({options: {color: 'red', size: {type: 'number'}}});
    expect(configurable.options).toHaveLength(2);
    const option1 = configurable.options[0];
    expect(option1).toBeInstanceOf(Option);
    expect(option1.name).toBe('color');
    expect(option1.default).toBe('red');
    const option2 = configurable.options[1];
    expect(option2).toBeInstanceOf(Option);
    expect(option2.name).toBe('size');
    expect(option2.type.name).toBe('number');
    expect(option2.default).toBeUndefined();
  });

  test('is serializable', () => {
    const configurable = new Configurable({options: {color: 'red', size: {type: 'number'}}});
    expect(toJSONDeep(configurable)).toEqual({
      options: [{name: 'color', default: 'red'}, {name: 'size', type: 'number'}]
    });
  });
});
