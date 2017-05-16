import {join} from 'path';

import ObjectResource from '../../src/resources/object';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';

describe('Resource loading ($load)', () => {
  test('can load a resource from a file', async () => {
    const Person = await ObjectResource.$load(join(__dirname, 'fixtures', 'person'));
    expect(Person).toBeInstanceOf(ObjectResource);
    expect(Person.$id).toBe('person');
    expect(Person.$version.toString()).toBe('1.0.0');
    expect(Person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(Person.$getProperty('age')).toBeInstanceOf(NumberResource);
  });

  test('can load a resource referenced from a resource type', async () => {
    const person = await ObjectResource.$create(
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
    const Company = await ObjectResource.$create(
      {name: {$type: 'string'}, boss: {$type: './fixtures/person'}},
      {directory: __dirname}
    );
    const company = Company.$instantiate({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
    expect(company.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(company.boss).toBeInstanceOf(ObjectResource);
    expect(company.$serialize()).toEqual({name: 'Resource Inc.', boss: {name: 'Manu', age: 44}});
  });
});
