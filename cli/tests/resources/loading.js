import {join} from 'path';

import CompositeResource from '../../src/resources/composite';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';

describe('Resource loading ($load)', () => {
  test('can load a resource from a file', async () => {
    const Person = await CompositeResource.$load(join(__dirname, 'fixtures', 'person'));
    expect(Person).toBeInstanceOf(CompositeResource);
    expect(Person.$id).toBe('person');
    expect(Person.$version.toString()).toBe('1.0.0');
    expect(Person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();

    const person = await CompositeResource.$load(join(__dirname, 'fixtures', 'person-instance'));
    expect(person).toBeInstanceOf(CompositeResource);
    expect(Person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(Person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('can load a resource referenced from a resource type', async () => {
    const person = await CompositeResource.$create(
      {$id: 'manu', $type: './fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$id).toBe('manu');
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.$getProperty('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      $id: 'manu',
      $type: './fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('can load a resource referenced from a property type', async () => {
    const Company = await CompositeResource.$create(
      {name: {$type: 'string'}, boss: {$type: './fixtures/person'}},
      {directory: __dirname}
    );
    const company = Company.$instantiate({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
    expect(company.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(company.boss).toBeInstanceOf(CompositeResource);
    expect(company.$serialize()).toEqual({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
  });
});
