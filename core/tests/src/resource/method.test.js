import Resource from '../../../dist/resource';
import MethodResource from '../../../dist/resource/method';
import StringResource from '../../../dist/resource/string';
import NumberResource from '../../../dist/resource/number';
import ArrayResource from '../../../dist/resource/array';
import ObjectResource from '../../../dist/resource/object';

describe('MethodResource', () => {
  test('creation', async () => {
    const method = await MethodResource.$create({
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

    expect(method).toBeInstanceOf(MethodResource);

    let children;

    const input = method.$getInput();
    expect(input).toBeInstanceOf(Resource);
    children = input.$getChildren();
    expect(children).toHaveLength(4);
    expect(children[0]).toBeInstanceOf(StringResource);
    expect(children[0].$getKey()).toBe('name');
    expect(children[0].$position).toBe(0);
    expect(children[0].$isOptional).toBeUndefined();
    expect(children[0].$isVariadic).toBeUndefined();
    expect(children[0].$isSubInput).toBeUndefined();
    expect(children[1]).toBeInstanceOf(NumberResource);
    expect(children[1].$getKey()).toBe('age');
    expect(children[1].$position).toBeUndefined();
    expect(children[1].$isOptional).toBe(true);
    expect(children[1].$isVariadic).toBeUndefined();
    expect(children[1].$isSubInput).toBeUndefined();
    expect(children[2]).toBeInstanceOf(ArrayResource);
    expect(children[2].$getKey()).toBe('tags');
    expect(children[2].$position).toBe(1);
    expect(children[2].$isOptional).toBeUndefined();
    expect(children[2].$isVariadic).toBe(true);
    expect(children[2].$isSubInput).toBeUndefined();
    expect(children[3]).toBeInstanceOf(ObjectResource);
    expect(children[3].$getKey()).toBe('subInput');
    expect(children[3].$position).toBeUndefined();
    expect(children[3].$isOptional).toBeUndefined();
    expect(children[3].$isVariadic).toBeUndefined();
    expect(children[3].$isSubInput).toBe(true);

    const output = method.$getOutput();
    expect(output).toBeInstanceOf(Resource);
    children = output.$getChildren();
    expect(children).toHaveLength(1);
    expect(children[0]).toBeInstanceOf(StringResource);
    expect(children[0].$getKey()).toBe('result');

    expect(method.$beforeExpression).toEqual(['@console print Deploying...']);
    expect(method.$runExpression).toEqual(['frontend deploy --@verbose']);
    expect(method.$afterExpression).toEqual(['@console print Depoyment completed']);
    expect(method.$listenedEvents).toEqual(['build']);
    expect(method.$unlistenedEvents).toEqual(['test']);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});

    expect((await Person.formatGreetingMethod()).result).toBe('Hello Anonymous!');

    let person;

    person = await Person.$extend({name: 'Manu'});

    expect((await person.formatGreetingMethod()).result).toBe('Hello Manu!');
    expect((await person.formatGreetingMethod({shout: true})).result).toBe('HELLO MANU!');
    expect((await person.formatGreetingMethod({verb: 'Konnichiwa'})).result).toBe('Konnichiwa Manu!');
    await expect(person.formatGreetingMethod({unknownArg: 1})).rejects.toBeInstanceOf(Error);

    expect((await person.formatGreetingExpression()).result).toBe('Hi Manu!');

    person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect((await person.formatGreetingMethod()).result).toBe('Hello Manu!');
  });

  test('invocation with optional parameter', async () => {
    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
    expect((await person.formatNameAndAge({name: 'Manu'})).result).toBe('Manu');
    expect((await person.formatNameAndAge({name: 'Manu', age: 45})).result).toBe('Manu (45)');
    await expect(person.formatNameAndAge({age: 45})).rejects.toBeInstanceOf(Error);
  });

  test('invocation with variadic parameter', async () => {
    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect((await person.formatTags()).result).toBe('');
    expect((await person.formatTags({tags: ['cool']})).result).toBe('cool');
    expect((await person.formatTags({tags: ['cool', 'nice']})).result).toBe('cool, nice');

    let method;

    method = await MethodResource.$create({
      '@run': 'formatTags',
      '@output': {result: {'@type': 'string'}}
    });
    expect((await method.$invoke(undefined, {parent: person})).result).toBe('');

    method = await MethodResource.$create({
      '@run': 'formatTags cool',
      '@output': {result: {'@type': 'string'}}
    });
    expect((await method.$invoke(undefined, {parent: person})).result).toBe('cool');

    method = await MethodResource.$create({
      '@run': 'formatTags cool nice',
      '@output': {result: {'@type': 'string'}}
    });
    expect((await method.$invoke(undefined, {parent: person})).result).toBe('cool, nice');

    method = await MethodResource.$create({
      '@run': 'formatTags cool nice smart',
      '@output': {result: {'@type': 'string'}}
    });
    expect((await method.$invoke(undefined, {parent: person})).result).toBe('cool, nice, smart');
  });

  test('events', async () => {
    const person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
  });

  test('inherited events', async () => {
    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
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
      {'@import': '../../fixtures/person', build: {'@unlisten': 'publish'}},
      {directory: __dirname}
    );
    expect(person.hasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(false);
  });

  test('before and after hooks', async () => {
    const person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(person.hookTestResults).toEqual([]);
    await person.hookTest();
    expect(person.hookTestResults).toEqual(['beforeHookTest', 'hookTest', 'afterHookTest']);
  });

  test('inherited before and after hooks', async () => {
    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
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

  test('multiple inheritance', async () => {
    const personWithMixin = await Resource.$create(
      {'@import': ['../../fixtures/person', '../../fixtures/mixin']},
      {directory: __dirname}
    );
    expect((await personWithMixin.formatGreetingMethod()).result).toBe('Hello Anonymous!');
    expect((await personWithMixin.mixinMethod()).result).toBe('mixin-method-returned-value');
  });

  test('serialization', async () => {
    expect((await MethodResource.$create()).$serialize()).toBeUndefined();

    expect((await MethodResource.$create({'@type': 'method'})).$serialize()).toEqual({
      '@type': 'method'
    });

    expect((await MethodResource.$create({
      '@input': {
        name: {'@type': 'string', '@position': 0},
        age: {'@type': 'number', '@isOptional': true}
      }
    })).$serialize()).toEqual({
      '@input': {
        name: {'@type': 'string', '@position': 0},
        age: {'@type': 'number', '@isOptional': true}
      }
    });

    expect((await MethodResource.$create({
      '@input': {tags: {'@type': 'array', '@position': 0, '@isVariadic': true}}
    })).$serialize()).toEqual({
      '@input': {tags: {'@type': 'array', '@position': 0, '@isVariadic': true}}
    });

    expect((await MethodResource.$create({
      '@input': {subInput: {'@type': 'object', '@isSubInput': true}}
    })).$serialize()).toEqual({
      '@input': {subInput: {'@type': 'object', '@isSubInput': true}}
    });

    expect((await MethodResource.$create({
      '@output': {
        result: {'@type': 'string', '@isOptional': true},
        error: {'@type': 'number'}
      }
    })).$serialize()).toEqual({
      '@output': {
        result: {'@type': 'string', '@isOptional': true},
        error: {'@type': 'number'}
      }
    });

    expect((await MethodResource.$create({'@run': 'frontend deploy --@verbose'})).$serialize()).toEqual({'@run': 'frontend deploy --@verbose'});

    expect((await MethodResource.$create({'@run': ['build', 'deploy']})).$serialize()).toEqual({
      '@run': ['build', 'deploy']
    });

    expect((await MethodResource.$create({'@before': '@console print Deploying...'})).$serialize()).toEqual({'@before': '@console print Deploying...'});

    expect((await MethodResource.$create({'@after': '@console print Depoyment completed'})).$serialize()).toEqual({'@after': '@console print Depoyment completed'});

    expect((await MethodResource.$create({'@listen': 'build'})).$serialize()).toEqual({
      '@listen': 'build'
    });
    expect((await MethodResource.$create({
      '@listen': ['build', 'install']
    })).$serialize()).toEqual({'@listen': ['build', 'install']});

    expect((await MethodResource.$create({'@unlisten': 'build'})).$serialize()).toEqual({
      '@unlisten': 'build'
    });
  });
});
