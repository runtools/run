import {join} from 'path';

import {run} from '../..';

const personInstanceDirectory = join(
  __dirname,
  '..',
  '..',
  '..',
  'core',
  'tests',
  'fixtures',
  'person-instance'
);

describe('CLI', () => {
  test('can get a resource from a directory', async () => {
    const person = await run('', {directory: personInstanceDirectory});
    expect(person.name).toBe('Manu');
  });

  test('can get a property', async () => {
    const name = await run('name', {directory: personInstanceDirectory});
    expect(name.$value).toBe('Manu');
    await expect(run('invalidProperty', {directory: personInstanceDirectory})).rejects.toBeInstanceOf(Error);
  });

  test('can run a method', async () => {
    let greeting;

    greeting = await run('formatGreetingMethod', {directory: personInstanceDirectory});
    expect(greeting.$value).toBe('Hello Manu!');

    greeting = await run('formatGreetingMethod --verb=Welcome', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('Welcome Manu!');

    greeting = await run('formatGreetingMethod Konnichiwa', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('Konnichiwa Manu!');

    greeting = await run('formatGreetingMethod Bonjour --shout', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('BONJOUR MANU!');

    await expect(run('formatGreetingMethod Hi extraArgument', {directory: personInstanceDirectory})).rejects.toBeInstanceOf(Error);

    greeting = await run('formatGreetingExpression', {directory: personInstanceDirectory});
    expect(greeting.$value).toBe('Hi Manu!');
  });
});
