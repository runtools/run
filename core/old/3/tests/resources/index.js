import {join} from 'path';

import {createResource, loadResource} from '../../src/resources';
import BaseResource from '../../src/resources/base';
import BooleanResource from '../../src/resources/boolean';
import NumberResource from '../../src/resources/number';
import StringResource from '../../src/resources/string';
import ArrayResource from '../../src/resources/array';
import ObjectResource from '../../src/resources/object';
import CompositeResource from '../../src/resources/composite';

describe('Resource', () => {
  test('can create Resource', async () => {
    expect(await createResource({$type: 'resource'})).toBeInstanceOf(BaseResource);
    expect(await createResource({$types: ['resource']})).toBeInstanceOf(BaseResource);
    await expect(createResource({$type: 'invalid'})).rejects.toBeInstanceOf(Error);
  });

  test('can create BooleanResource', async () => {
    expect(await createResource({$type: 'boolean'})).toBeInstanceOf(BooleanResource);
    expect(await createResource(true)).toBeInstanceOf(BooleanResource);
    expect(await createResource({$value: false})).toBeInstanceOf(BooleanResource);
  });

  test('can create NumberResource', async () => {
    expect(await createResource({$type: 'number'})).toBeInstanceOf(NumberResource);
    expect(await createResource(123.45)).toBeInstanceOf(NumberResource);
    expect(await createResource({$value: 0})).toBeInstanceOf(NumberResource);
  });

  test('can create StringResource', async () => {
    expect(await createResource({$type: 'string'})).toBeInstanceOf(StringResource);
    expect(await createResource('Hello')).toBeInstanceOf(StringResource);
    expect(await createResource({$value: ''})).toBeInstanceOf(StringResource);
  });

  test('can create ArrayResource', async () => {
    expect(await createResource({$type: 'array'})).toBeInstanceOf(ArrayResource);
    expect(await createResource([1])).toBeInstanceOf(ArrayResource);
    expect(await createResource({$value: []})).toBeInstanceOf(ArrayResource);
  });

  test('can create ObjectResource', async () => {
    expect(await createResource()).toBeInstanceOf(ObjectResource);
    expect(await createResource({})).toBeInstanceOf(ObjectResource);
    expect(await createResource({$value: {}})).toBeInstanceOf(ObjectResource);
    expect(await createResource({$types: []})).toBeInstanceOf(ObjectResource);
    expect(await createResource({$type: 'object'})).toBeInstanceOf(ObjectResource);
  });

  test('can create CompositeResource', async () => {
    expect(await createResource({$type: 'composite'})).toBeInstanceOf(CompositeResource);
    expect(await createResource({$type: {$name: 'person', $type: 'composite'}})).toBeInstanceOf(
      CompositeResource
    );
  });

  test('can load a resource from a file', async () => {
    const Person = await loadResource(join(__dirname, 'fixtures', 'person'));
    expect(Person).toBeInstanceOf(CompositeResource);
    expect(Person.$name).toBe('person');
    expect(Person.$version.toString()).toBe('1.0.0');
    expect(Person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();

    const person = await loadResource(join(__dirname, 'fixtures', 'person-instance'));
    expect(person).toBeInstanceOf(CompositeResource);
    expect(Person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(Person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('can load a resource referenced from a resource type', async () => {
    const person = await createResource(
      {$name: 'manu', $type: './fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$name).toBe('manu');
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.$getProperty('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      $name: 'manu',
      $type: './fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('can load a resource referenced from a property type', async () => {
    const Company = await createResource(
      {$type: 'composite', name: {$type: 'string'}, boss: {$type: './fixtures/person'}},
      {directory: __dirname}
    );
    const company = Company.$instantiate({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
    expect(company.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(company.boss).toBeInstanceOf(CompositeResource);
    expect(company.$serialize()).toEqual({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
  });
});
