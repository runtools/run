import test from 'ava';
import {
  createRequestBuilder,
  handleRequest,
  buildResponse,
  handleRequestAndBuildResponse,
  handleResponse
} from './src';

test('createRequestBuilder()', t => {
  let req;

  req = createRequestBuilder('subtract', 'xyz')(1, 2);
  t.deepEqual(req, {
    jsonrpc: '2.0', method: 'subtract', id: 'xyz', params: [1, 2]
  });

  req = createRequestBuilder('random')();
  t.deepEqual(req, {
    jsonrpc: '2.0', method: 'random', id: null
  });

  req = createRequestBuilder('random', 123)();
  t.deepEqual(req, {
    jsonrpc: '2.0', method: 'random', id: 123
  });

  t.throws(() => createRequestBuilder('random', ''));

  t.throws(() => createRequestBuilder()());
  t.throws(() => createRequestBuilder('')());
});

test('handleRequest()', t => {
  let request, result;

  request = { jsonrpc: '2.0', method: 'random', id: 'xyz' };
  result = handleRequest(request, { random: () => 0.5 });
  t.is(result, 0.5);

  request = {
    jsonrpc: '2.0', method: 'subtract', id: 'xyz', params: [3, 1]
  };
  result = handleRequest(request, { subtract: (a, b) => a - b });
  t.is(result, 2);

  t.throws(
    () => handleRequest({ jsonrpc: '1.0' }, {}),
    err => err.code === -32600
  );
  t.throws(
    () => handleRequest({ jsonrpc: '2.0', method: '' }, {}),
    err => err.code === -32600
  );

  t.throws(
    () => handleRequest({ jsonrpc: '2.0', method: 'random', id: 'xyz' }, undefined),
    err => err.code === -32603
  );

  request = { jsonrpc: '2.0', method: 'subtract', id: 'xyz', params: 1 };
  t.throws(
    () => handleRequest(request, { subtract: (a, b) => a - b }),
    err => err.code === -32602
  );
});

test('buildResponse()', async t => {
  let response;

  response = buildResponse(() => 1, 'xyz');
  t.deepEqual(response, { jsonrpc: '2.0', result: 1, id: 'xyz' });

  response = buildResponse(() => undefined, 'xyz');
  t.deepEqual(response, { jsonrpc: '2.0', id: 'xyz' });

  response = buildResponse(() => null, 'xyz');
  t.deepEqual(response, { jsonrpc: '2.0', result: null, id: 'xyz' });

  response = buildResponse(() => { throw new Error('Grr'); }, 'xyz');
  t.deepEqual(response, {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'Error' } },
    id: 'xyz'
  });

  response = buildResponse(() => {
    const err = new Error('Grr');
    err.status = 404;
    throw err;
  }, 'xyz');
  t.deepEqual(response, {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'Error', status: 404 } },
    id: 'xyz'
  });

  response = await buildResponse(async () => 1, 'xyz');
  t.deepEqual(response, { jsonrpc: '2.0', result: 1, id: 'xyz' });

  response = await buildResponse(async () => { throw new Error('Grr'); }, 'xyz');
  t.deepEqual(response, {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'Error' } },
    id: 'xyz'
  });

  t.throws(() => buildResponse());
  t.throws(() => buildResponse(1));
});

test('handleRequestAndBuildResponse()', async t => {
  let request, response;

  request = { jsonrpc: '2.0', method: 'random', id: 'xyz' };
  response = handleRequestAndBuildResponse(request, { random: () => 0.5 });
  t.deepEqual(response, { jsonrpc: '2.0', result: 0.5, id: 'xyz' });

  request = { jsonrpc: '2.0', method: 'random', id: 'xyz' };
  response = handleRequestAndBuildResponse(request, {
    random: () => { throw new Error('Grr'); }
  });
  t.deepEqual(response, {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'Error' } },
    id: 'xyz'
  });

  request = { jsonrpc: '2.0', method: 'random', id: 'xyz' };
  response = await handleRequestAndBuildResponse(request, { random: async () => 0.5 });
  t.deepEqual(response, { jsonrpc: '2.0', result: 0.5, id: 'xyz' });

  request = { jsonrpc: '2.0', method: 'random', id: 'xyz' };
  response = await handleRequestAndBuildResponse(request, {
    random: async () => { throw new Error('Grr'); }
  });
  t.deepEqual(response, {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'Error' } },
    id: 'xyz'
  });
});

test('handleResponse()', t => {
  let response, result;

  response = { jsonrpc: '2.0', result: 0.5, id: 'xyz' };
  result = handleResponse(response, 'xyz');
  t.is(result, 0.5);

  response = { jsonrpc: '2.0', id: 'xyz' };
  result = handleResponse(response, 'xyz');
  t.is(result, undefined);

  response = {
    jsonrpc: '2.0',
    error: { code: 1, message: 'Grr', data: { name: 'SpecialError', status: 404 } },
    id: 'xyz'
  };
  t.throws(
    () => handleResponse(response, 'xyz'),
    (err) => err.code === 1 && err.message === 'Grr' && err.name === 'SpecialError' && err.status === 404
  );
});
