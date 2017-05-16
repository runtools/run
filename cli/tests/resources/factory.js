import Resource from '../../src/resources';
import BooleanResource from '../../src/resources/boolean';
import NumberResource from '../../src/resources/number';
import StringResource from '../../src/resources/string';
import ArrayResource from '../../src/resources/array';
import ObjectResource from '../../src/resources/object';

describe('Resource factory ($create)', () => {
  test('can create Resource', async () => {
    expect(await Resource.$create({$type: '$resource'})).toBeInstanceOf(Resource);
    expect(await Resource.$create({$types: ['$resource']})).toBeInstanceOf(Resource);
    await expect(Resource.$create({$type: '$invalid'})).rejects.toBeInstanceOf(Error);
  });

  test('can create BooleanResource', async () => {
    expect(await Resource.$create({$type: '$boolean'})).toBeInstanceOf(BooleanResource);
    expect(await Resource.$create(true)).toBeInstanceOf(BooleanResource);
  });

  test('can create NumberResource', async () => {
    expect(await Resource.$create({$type: '$number'})).toBeInstanceOf(NumberResource);
    expect(await Resource.$create(123.45)).toBeInstanceOf(NumberResource);
  });

  test('can create StringResource', async () => {
    expect(await Resource.$create({$type: '$string'})).toBeInstanceOf(StringResource);
    expect(await Resource.$create('Hello')).toBeInstanceOf(StringResource);
  });

  test('can create ArrayResource', async () => {
    expect(await Resource.$create({$type: '$array'})).toBeInstanceOf(ArrayResource);
    expect(await Resource.$create([1])).toBeInstanceOf(ArrayResource);
  });

  test('can create ObjectResource', async () => {
    expect(await Resource.$create()).toBeInstanceOf(ObjectResource);
    expect(await Resource.$create({})).toBeInstanceOf(ObjectResource);
    expect(await Resource.$create({$types: []})).toBeInstanceOf(ObjectResource);
    expect(await Resource.$create({$type: '$object'})).toBeInstanceOf(ObjectResource);
    expect(await Resource.$create({$type: {$id: 'person', $type: '$object'}})).toBeInstanceOf(
      ObjectResource
    );
  });
});
