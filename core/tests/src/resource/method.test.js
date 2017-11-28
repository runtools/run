import Resource from '../../../dist/resource';
import MethodResource from '../../../dist/resource/method';
import StringResource from '../../../dist/resource/string';
import NumberResource from '../../../dist/resource/number';

describe('MethodResource', () => {
  test('creation', async () => {
    const method = await MethodResource.$create({
      '@parameters': {name: {'@type': 'string', '@position': 0}, age: {'@type': 'number'}},
      '@before': '@console print Deploying...',
      '@run': 'frontend deploy --@verbose',
      '@after': '@console print Depoyment completed',
      '@listen': 'build',
      '@unlisten': 'test'
    });

    expect(method).toBeInstanceOf(MethodResource);

    const params = method.$getParameters();
    expect(params).toHaveLength(2);
    expect(params[0]).toBeInstanceOf(StringResource);
    expect(params[0].$getKey()).toBe('name');
    expect(params[0].$position).toBe(0);
    expect(params[1]).toBeInstanceOf(NumberResource);
    expect(params[1].$getKey()).toBe('age');
    expect(params[1].$position).toBeUndefined();

    expect(method.$beforeExpression).toEqual(['@console print Deploying...']);
    expect(method.$runExpression).toEqual(['frontend deploy --@verbose']);
    expect(method.$afterExpression).toEqual(['@console print Depoyment completed']);
    expect(method.$listenedEvents).toEqual(['build']);
    expect(method.$unlistenedEvents).toEqual(['test']);
  });

  test('invocation', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(await Person.formatGreetingMethod()).toBe('Hello Anonymous!');

    let person = await Person.$extend({name: 'Manu'});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
    expect(await person.formatGreetingMethod({shout: true})).toBe('HELLO MANU!');
    expect(await person.formatGreetingMethod({verb: 'Konnichiwa'})).toBe('Konnichiwa Manu!');
    await expect(person.formatGreetingMethod({unknownArg: 1})).rejects.toBeInstanceOf(Error);

    expect(await person.formatGreetingExpression()).toBe('Hi Manu!');
    expect(await person.formatGreetingExpression({verb: 'Bonjour'})).toBe('Bonjour Manu!');

    person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});

    expect(await person.formatGreetingMethod()).toBe('Hello Manu!');
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
    expect(await personWithMixin.formatGreetingMethod()).toBe('Hello Anonymous!');
    expect(await personWithMixin.mixinMethod()).toBe('mixin-method-returned-value');
  });

  test('serialization', async () => {
    expect((await MethodResource.$create()).$serialize()).toBeUndefined();

    expect((await MethodResource.$create({'@type': 'method'})).$serialize()).toEqual({
      '@type': 'method'
    });

    expect(
      (await MethodResource.$create({
        '@parameters': {name: {'@type': 'string', '@position': 0}, age: {'@type': 'number'}}
      })).$serialize()
    ).toEqual({
      '@parameters': {name: {'@type': 'string', '@position': 0}, age: {'@type': 'number'}}
    });

    expect(
      (await MethodResource.$create({'@run': 'frontend deploy --@verbose'})).$serialize()
    ).toEqual({'@run': 'frontend deploy --@verbose'});

    expect((await MethodResource.$create({'@run': ['build', 'deploy']})).$serialize()).toEqual({
      '@run': ['build', 'deploy']
    });

    expect(
      (await MethodResource.$create({'@before': '@console print Deploying...'})).$serialize()
    ).toEqual({'@before': '@console print Deploying...'});

    expect(
      (await MethodResource.$create({'@after': '@console print Depoyment completed'})).$serialize()
    ).toEqual({'@after': '@console print Depoyment completed'});

    expect((await MethodResource.$create({'@listen': 'build'})).$serialize()).toEqual({
      '@listen': 'build'
    });
    expect(
      (await MethodResource.$create({
        '@listen': ['build', 'install']
      })).$serialize()
    ).toEqual({'@listen': ['build', 'install']});

    expect((await MethodResource.$create({'@unlisten': 'build'})).$serialize()).toEqual({
      '@unlisten': 'build'
    });
  });
});
