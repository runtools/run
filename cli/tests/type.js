import {join} from 'path';
import Type from '../src/type';

describe('Type', () => {
  test('must have a valid name', () => {
    expect(() => new Type({name: 'boolean'})).not.toThrow();
    expect(() => new Type({name: 'unknown'})).toThrow();
  });

  test('is a string by default', () => {
    const type = new Type();
    expect(type.name).toBe('string');
  });

  test('can have a contentTypeName', () => {
    const type = new Type({name: 'array', contentTypeName: 'string'});
    expect(type.contentTypeName).toBe('string');
    expect(() => new Type({name: 'array', contentTypeName: 'unknown'})).toThrow();
  });

  test('can be construct from a string', () => {
    const number = new Type('number');
    expect(number.name).toBe('number');
  });

  test('support arrays', () => {
    const strings = new Type('array');
    expect(strings.name).toBe('array');
    expect(strings.contentTypeName).toBe('string');
    const numbers = new Type('array<number>');
    expect(numbers.name).toBe('array');
    expect(numbers.contentTypeName).toBe('number');
  });

  test('is serializable', () => {
    expect(new Type({name: 'boolean'}).toJSON()).toBe('boolean');
    expect(new Type({name: 'number'}).toJSON()).toBe('number');
    expect(new Type({name: 'string'}).toJSON()).toBeUndefined();
    expect(new Type({name: 'array', contentTypeName: 'string'}).toJSON()).toBe('array');
    expect(new Type({name: 'array', contentTypeName: 'number'}).toJSON()).toBe('array<number>');
  });

  test('can be inferred from a value', () => {
    expect(() => Type.infer(null)).toThrow();
    expect(Type.infer(undefined)).toBe('string');
    expect(Type.infer(false)).toBe('boolean');
    expect(Type.infer(0)).toBe('number');
    expect(Type.infer('')).toBe('string');
    expect(Type.infer([])).toBe('array');
    expect(Type.infer([123])).toBe('array<number>');
  });

  test('can convert a string to boolean', () => {
    const type = new Type('boolean');
    expect(type.convert('false')).toBe(false);
    expect(type.convert('FALSE')).toBe(false);
    expect(type.convert('0')).toBe(false);
    expect(type.convert('no')).toBe(false);
    expect(type.convert('true')).toBe(true);
    expect(type.convert('TRUE')).toBe(true);
    expect(type.convert('1')).toBe(true);
    expect(type.convert('yes')).toBe(true);
    expect(() => type.convert('hello')).toThrow();
  });

  test('can convert a string to number', () => {
    const type = new Type('number');
    expect(type.convert('0')).toBe(0);
    expect(type.convert('-123')).toBe(-123);
    expect(type.convert('456.789')).toBe(456.789);
    expect(() => type.convert('hello')).toThrow();
  });

  test('can convert a string to a string', () => {
    const type = new Type('string');
    expect(type.convert('hello')).toBe('hello');
    expect(() => type.convert(123)).toThrow();
  });

  test('can convert a string to a path', () => {
    const type = new Type('path');
    const cwd = process.cwd();
    expect(type.convert('hello', {dir: cwd})).toBe(join(cwd, 'hello'));
    expect(type.convert('', {dir: cwd})).toBe(cwd);
    expect(type.convert('.', {dir: cwd})).toBe(cwd);
    expect(type.convert(cwd, {dir: cwd})).toBe(cwd);
    expect(() => type.convert('hello')).toThrow();
  });

  test('can convert an array of string', () => {
    const type = new Type('array<number>');
    expect(type.convert([])).toEqual([]);
    expect(type.convert(['1', '2', '3'])).toEqual([1, 2, 3]);
    expect(() => type.convert('1')).toThrow();
    expect(() => type.convert([1])).toThrow();
  });
});
