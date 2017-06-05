import {toJSONDeep} from 'run-common';

import Method from '../src/method';
import Parameter from '../src/parameter';
import Expression from '../src/expression';

describe('Method', () => {
  test('must have a name', () => {
    expect(() => new Method()).toThrow();
    expect(() => new Method({name: ''})).toThrow();
    const method = new Method({name: 'hello'});
    expect(method.name).toBe('hello');
  });

  test('can have parameters', () => {
    const method = new Method({name: 'hello', parameters: {color: 'red', size: {type: 'number'}}});
    expect(method.parameters).toHaveLength(2);
    const param1 = method.parameters[0];
    expect(param1).toBeInstanceOf(Parameter);
    expect(param1.name).toBe('color');
    expect(param1.default).toBe('red');
    const param2 = method.parameters[1];
    expect(param2).toBeInstanceOf(Parameter);
    expect(param2.name).toBe('size');
    expect(param2.type.name).toBe('number');
    expect(param2.default).toBeUndefined();
  });

  test('can run another method', () => {
    const method = new Method({name: 'hello', runs: 'say hello --bold'});
    expect(method.runs).toHaveLength(1);
    const expression = method.runs[0];
    expect(expression).toBeInstanceOf(Expression);
    expect(expression.arguments).toEqual(['say', 'hello']);
    expect(expression.config).toEqual({bold: 'true'});
  });

  test('can run several other methods', () => {
    testMethod(new Method({name: 'hello', runs: ['build src', 'deploy --env=production']}));
    testMethod(new Method({name: 'hello', runs: 'build src, deploy --env=production'}));
    function testMethod(method) {
      expect(method.runs).toHaveLength(2);
      const expression1 = method.runs[0];
      expect(expression1.arguments).toEqual(['build', 'src']);
      expect(expression1.config).toEqual({});
      const expression2 = method.runs[1];
      expect(expression2.arguments).toEqual(['deploy']);
      expect(expression2.config).toEqual({env: 'production'});
    }
  });

  test('is serializable', () => {
    const definition = {name: 'hello', parameters: ['verbose'], runs: 'say hello --bold'};
    const method = new Method(definition);
    expect(toJSONDeep(method)).toEqual(definition);
  });
});
