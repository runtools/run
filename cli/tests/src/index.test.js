import {join} from 'path';

import {runExpression} from '../../..';

const personInstanceDirectory = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'core',
  'tests',
  'dist',
  'cjs',
  'fixtures',
  'person-instance'
);

describe('CLI', () => {
  test('can get a resource from a directory', async () => {
    const person = await runExpression('.', {directory: personInstanceDirectory});
    expect(person.name).toBe('Manu');
  });

  test('can get a property', async () => {
    const name = await runExpression('. name', {directory: personInstanceDirectory});
    expect(name.$value).toBe('Manu');
    await expect(
      runExpression('. invalidProperty', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);
  });

  test('can run a method', async () => {
    let greeting;

    greeting = await runExpression('. formatGreetingMethod', {directory: personInstanceDirectory});
    expect(greeting.$value).toBe('Hello Manu!');

    greeting = await runExpression('. formatGreetingMethod --verb=Welcome', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('Welcome Manu!');

    greeting = await runExpression('. formatGreetingMethod Konnichiwa', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('Konnichiwa Manu!');

    greeting = await runExpression('. formatGreetingMethod Bonjour --shout', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('BONJOUR MANU!');

    await expect(
      runExpression('. formatGreetingMethod Hi extraArgument', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);

    greeting = await runExpression('. formatGreetingExpression', {
      directory: personInstanceDirectory
    });
    expect(greeting.$value).toBe('Hi Manu!');
  });
});
