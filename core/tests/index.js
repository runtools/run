import {createResource, loadResource} from '../src';
import Resource from '../src/resource';
import BooleanResource from '../src/primitives/boolean';
import NumberResource from '../src/primitives/number';
import StringResource from '../src/primitives/string';
import ArrayResource from '../src/primitives/array';
import ObjectResource from '../src/primitives/object';

describe('Core', () => {
  test('Resource creation', async () => {
    expect(await createResource()).toBeInstanceOf(Resource);
    expect(await createResource({})).toBeInstanceOf(Resource);
    expect(await createResource({$type: 'resource'})).toBeInstanceOf(Resource);
    expect(await createResource({$types: ['resource']})).toBeInstanceOf(Resource);
    await expect(createResource({$type: 'invalid'})).rejects.toBeInstanceOf(Error);
  });

  test('BooleanResource creation', async () => {
    expect(await createResource({$type: 'boolean'})).toBeInstanceOf(BooleanResource);
    expect(await createResource(true)).toBeInstanceOf(BooleanResource);
    expect(await createResource({$value: false})).toBeInstanceOf(BooleanResource);
  });

  test('NumberResource creation', async () => {
    expect(await createResource({$type: 'number'})).toBeInstanceOf(NumberResource);
    expect(await createResource(123.45)).toBeInstanceOf(NumberResource);
    expect(await createResource({$value: 0})).toBeInstanceOf(NumberResource);
  });

  test('StringResource creation', async () => {
    expect(await createResource({$type: 'string'})).toBeInstanceOf(StringResource);
    expect(await createResource('Hello')).toBeInstanceOf(StringResource);
    expect(await createResource({$value: ''})).toBeInstanceOf(StringResource);
  });

  test('ArrayResource creation', async () => {
    expect(await createResource({$type: 'array'})).toBeInstanceOf(ArrayResource);
    expect(await createResource([1])).toBeInstanceOf(ArrayResource);
    expect(await createResource({$value: []})).toBeInstanceOf(ArrayResource);
  });

  test('ObjectResource creation', async () => {
    expect(await createResource({$type: 'object'})).toBeInstanceOf(ObjectResource);
    expect(await createResource({$value: {}})).toBeInstanceOf(ObjectResource);
  });

  test('Resource loaded from a file', async () => {
    const Person = await loadResource('./fixtures/person', {directory: __dirname});
    expect(Person).toBeInstanceOf(Resource);
    expect(Person.$name).toBe('person');
    expect(Person.$version.toString()).toBe('1.0.0');
    expect(Person.$get('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$get('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();

    const person = await loadResource('./fixtures/person-instance', {directory: __dirname});
    expect(person).toBeInstanceOf(Resource);
    expect(Person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(Person.$get('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('Resource loaded from a type', async () => {
    const person = await createResource(
      {$name: 'manu', $type: './fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$name).toBe('manu');
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.$get('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      $name: 'manu',
      $type: './fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('Resource loaded from a property', async () => {
    const Company = await createResource(
      {name: {$type: 'string'}, boss: {$type: './fixtures/person'}},
      {directory: __dirname}
    );
    expect(Company.$get('name')).toBeInstanceOf(StringResource);
    expect(Company.$get('boss')).toBeInstanceOf(Resource);
    expect(Company.$get('boss').$get('name')).toBeInstanceOf(StringResource);
    expect(Company.$get('boss').$get('age')).toBeInstanceOf(NumberResource);
  });
});
