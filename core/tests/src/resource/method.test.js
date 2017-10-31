import Resource from '../../../dist/resource';
import MethodResource from '../../../dist/resource/method';

describe('MethodResource', () => {
  test('creation', async () => {
    const method = await MethodResource.$create({
      '@before': '@console print Deploying...',
      '@run': 'frontend deploy --@verbose',
      '@after': '@console print Depoyment completed',
      '@listen': 'buildRequested'
    });
    expect(method).toBeInstanceOf(MethodResource);
    expect(method.$beforeExpression).toEqual(['@console print Deploying...']);
    expect(method.$runExpression).toEqual(['frontend deploy --@verbose']);
    expect(method.$afterExpression).toEqual(['@console print Depoyment completed']);
    expect(method.$getListenedEvents()).toHaveLength(1);
    expect(method.$getListenedEvents()[0]).toBe('buildRequested');
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
    expect(person.instanceHasBeenBuilt).toBe(false);
    await person.publish();
    expect(person.hasBeenBuilt).toBe(true);
    expect(person.instanceHasBeenBuilt).toBe(true);
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

    expect((await MethodResource.$create({'@listen': 'buildRequested'})).$serialize()).toEqual({
      '@listen': 'buildRequested'
    });
    expect(
      (await MethodResource.$create({
        '@listen': ['buildRequested', 'installRequested']
      })).$serialize()
    ).toEqual({'@listen': ['buildRequested', 'installRequested']});
  });
});
