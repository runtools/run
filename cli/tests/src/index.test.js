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
    expect(name).toBe('Manu');
    await expect(
      run('invalidProperty', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);
  });

  test('can run a method', async () => {
    let greeting;
    greeting = await run('formatGreetingMethod', {directory: personInstanceDirectory});
    expect(greeting).toBe('Hello Manu!');
    greeting = await run('formatGreetingMethod Konnichiwa', {directory: personInstanceDirectory});
    expect(greeting).toBe('Konnichiwa Manu!');
    await expect(
      run('formatGreetingMethod Hi extraArgument', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);
  });

  test('can run a command', async () => {
    let greeting;
    greeting = await run('formatGreetingCommand', {directory: personInstanceDirectory});
    expect(greeting).toBe('Hi Manu!');
    greeting = await run('formatGreetingCommand --ageLimit=44', {
      directory: personInstanceDirectory
    });
    expect(greeting).toBe('Hello Manu!');
    await expect(
      run('formatGreetingCommand extraArgument', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);
    await expect(
      run('formatGreetingCommand --invalidProperty=1', {directory: personInstanceDirectory})
    ).rejects.toBeInstanceOf(Error);
  });

  test('can run a macro', async () => {
    const greeting = await run('formatGreetingMacro', {directory: personInstanceDirectory});
    expect(greeting).toBe('Hello Manu!');
  });
});
