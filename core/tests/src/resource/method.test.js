import Resource from '../../../..';

describe('MethodResource', () => {
  test('creation', async () => {
    const method = await Resource.$create({
      '@type': 'method',
      '@input': {
        name: {'@type': 'string', '@position': 0},
        age: {'@type': 'number', '@isOptional': true},
        tags: {'@type': 'array', '@position': 1, '@isVariadic': true},
        subInput: {'@type': 'object', '@isSubInput': true}
      },
      '@output': {
        result: {'@type': 'string'}
      },
      '@before': '@console print Deploying...',
      '@run': 'frontend deploy --@verbose',
      '@after': '@console print Depoyment completed',
      '@listen': 'build',
      '@unlisten': 'test'
    });

    expect(method.$getType()).toBe('method');

    let children;

    const input = method.$getInput();
    expect(input).toBeInstanceOf(Resource);
    expect(input.$isOpen).toBe(false);
    children = input.$getChildren();
    expect(children).toHaveLength(4);
    expect(children[0].$getType()).toBe('string');
    expect(children[0].$getKey()).toBe('name');
    expect(children[0].$position).toBe(0);
    expect(children[0].$isOptional).toBeUndefined();
    expect(children[0].$isVariadic).toBeUndefined();
    expect(children[0].$isSubInput).toBeUndefined();
    expect(children[1].$getType()).toBe('number');
    expect(children[1].$getKey()).toBe('age');
    expect(children[1].$position).toBeUndefined();
    expect(children[1].$isOptional).toBe(true);
    expect(children[1].$isVariadic).toBeUndefined();
    expect(children[1].$isSubInput).toBeUndefined();
    expect(children[2].$getType()).toBe('array');
    expect(children[2].$getKey()).toBe('tags');
    expect(children[2].$position).toBe(1);
    expect(children[2].$isOptional).toBeUndefined();
    expect(children[2].$isVariadic).toBe(true);
    expect(children[2].$isSubInput).toBeUndefined();
    expect(children[3].$getType()).toBe('object');
    expect(children[3].$getKey()).toBe('subInput');
    expect(children[3].$position).toBeUndefined();
    expect(children[3].$isOptional).toBeUndefined();
    expect(children[3].$isVariadic).toBeUndefined();
    expect(children[3].$isSubInput).toBe(true);

    const output = method.$getOutput();
    expect(output).toBeInstanceOf(Resource);
    expect(output.$isOpen).toBe(false);
    children = output.$getChildren();
    expect(children).toHaveLength(1);
    expect(children[0].$getType()).toBe('string');
    expect(children[0].$getKey()).toBe('result');

    expect(method.$beforeExpression).toEqual(['@console print Deploying...']);
    expect(method.$runExpression).toEqual(['frontend deploy --@verbose']);
    expect(method.$afterExpression).toEqual(['@console print Depoyment completed']);
    expect(method.$listenedEvents).toEqual(['build']);
    expect(method.$unlistenedEvents).toEqual(['test']);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../fixtures/person', {directory: __dirname});

    expect(await Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person;

    person = await Person.$extend({name: 'Manu'});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(await person.formatGreetingMethod({shout: true})).toBe('HELLO MANU!');
    expect(await person.formatGreetingMethod({verb: 'Konnichiwa'})).toBe('Konnichiwa Manu!');
    await expect(person.formatGreetingMethod({unknownArg: 1})).rejects.toBeInstanceOf(Error);

    expect(await person.formatGreetingExpression()).toBe('Hi Manu!');

    person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
  });

  test('invocation with optional parameter', async () => {
    const person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(await person.formatNameAndAge({name: 'Manu'})).toBe('Manu');
    expect(await person.formatNameAndAge({name: 'Manu', age: 45})).toBe('Manu (45)');
    await expect(person.formatNameAndAge({age: 45})).rejects.toBeInstanceOf(Error);
  });

  test('invocation with variadic parameter', async () => {
    const person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});

    expect(await person.formatTags()).toBe('');
    expect(await person.formatTags({tags: ['cool']})).toBe('cool');
    expect(await person.formatTags({tags: ['cool', 'nice']})).toBe('cool, nice');

    let method;

    method = await Resource.$create({
      '@type': 'method',
      '@run': 'formatTags',
      '@output': {'@type': 'string'}
    });
    expect((await method.$call(person)).$value).toBe('');

    method = await Resource.$create({
      '@type': 'method',
      '@run': 'formatTags cool',
      '@output': {'@type': 'string'}
    });
    expect((await method.$call(person)).$value).toBe('cool');

    method = await Resource.$create({
      '@type': 'method',
      '@run': 'formatTags cool nice',
      '@output': {'@type': 'string'}
    });
    expect((await method.$call(person)).$value).toBe('cool, nice');

    method = await Resource.$create({
      '@type': 'method',
      '@run': 'formatTags cool nice smart',
      '@output': {'@type': 'string'}
    });
    expect((await method.$call(person)).$value).toBe('cool, nice, smart');
  });

  test('events', async () => {
    const person = await Resource.$import('../fixtures/person', {directory: __dirname});
    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
  });

  test('inherited events', async () => {
    const person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(person.hasBeenBuilt).toBe(false);
    expect(person.hasBeenBuiltByInstance).toBe(false);
    expect(person.hasBeenTested).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
    expect(person.hasBeenBuiltByInstance).toBe(true);
    expect(person.hasBeenTested).toBe(true);
  });

  test('unlistened events', async () => {
    const person = await Resource.$create(
      {'@import': '../fixtures/person', build: {'@unlisten': 'publish'}},
      {directory: __dirname}
    );
    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(false);
  });

  test('before and after hooks', async () => {
    const person = await Resource.$import('../fixtures/person', {directory: __dirname});
    expect(person.hookTestResults).toEqual([]);
    await person.hookTest();
    expect(person.hookTestResults).toEqual(['beforeHookTest', 'hookTest', 'afterHookTest']);
  });

  test('inherited before and after hooks', async () => {
    const person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(person.hookTestResults).toEqual([]);
    await person.hookTest();
    expect(person.hookTestResults).toEqual([
      'beforeHookTest',
      'instanceBeforeHookTest',
      'hookTest',
      'instanceAfterHookTest',
      'afterHookTest'
    ]);
  });

  test('initialization', async () => {
    const person = await Resource.$import('../fixtures/person', {directory: __dirname});
    expect(person.hasBeenInitialized).toBe(false);
    await person.formatGreetingMethod();
    expect(person.hasBeenInitialized).toBe(true);
  });

  test('multiple inheritance', async () => {
    const personWithMixin = await Resource.$create(
      {'@import': ['../fixtures/person', '../fixtures/mixin']},
      {directory: __dirname}
    );
    expect(await personWithMixin.formatGreetingMethod()).toBe('Hello Anonymous!');
    expect(await personWithMixin.mixinMethod()).toBe('mixin-method-returned-value');
  });

  test('serialization', async () => {
    expect((await Resource.$create({'@type': 'method'})).$serialize()).toEqual({
      '@type': 'method'
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@input': {
          name: {'@type': 'string', '@position': 0},
          age: {'@type': 'number', '@isOptional': true}
        }
      })).$serialize()
    ).toEqual({
      '@type': 'method',
      '@input': {
        name: {'@type': 'string', '@position': 0},
        age: {'@type': 'number', '@isOptional': true}
      }
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@input': {tags: {'@type': 'array', '@position': 0, '@isVariadic': true}}
      })).$serialize()
    ).toEqual({
      '@type': 'method',
      '@input': {tags: {'@type': 'array', '@position': 0, '@isVariadic': true}}
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@input': {subInput: {'@type': 'object', '@isSubInput': true}}
      })).$serialize()
    ).toEqual({
      '@type': 'method',
      '@input': {subInput: {'@type': 'object', '@isSubInput': true}}
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@output': {
          result: {'@type': 'string', '@isOptional': true},
          error: {'@type': 'number'}
        }
      })).$serialize()
    ).toEqual({
      '@type': 'method',
      '@output': {
        result: {'@type': 'string', '@isOptional': true},
        error: {'@type': 'number'}
      }
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@run': 'frontend deploy --@verbose'
      })).$serialize()
    ).toEqual({'@type': 'method', '@run': 'frontend deploy --@verbose'});

    expect(
      (await Resource.$create({'@type': 'method', '@run': ['build', 'deploy']})).$serialize()
    ).toEqual({
      '@type': 'method',
      '@run': ['build', 'deploy']
    });

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@before': '@console print Deploying...'
      })).$serialize()
    ).toEqual({'@type': 'method', '@before': '@console print Deploying...'});

    expect(
      (await Resource.$create({
        '@type': 'method',
        '@after': '@console print Depoyment completed'
      })).$serialize()
    ).toEqual({'@type': 'method', '@after': '@console print Depoyment completed'});

    expect((await Resource.$create({'@type': 'method', '@listen': 'build'})).$serialize()).toEqual({
      '@type': 'method',
      '@listen': 'build'
    });
    expect(
      (await Resource.$create({'@type': 'method', '@listen': ['build', 'install']})).$serialize()
    ).toEqual({'@type': 'method', '@listen': ['build', 'install']});

    expect(
      (await Resource.$create({'@type': 'method', '@unlisten': 'build'})).$serialize()
    ).toEqual({
      '@type': 'method',
      '@unlisten': 'build'
    });
  });
});
