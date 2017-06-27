/* eslint-disable */

import Koa from 'koa';
import body from 'koa-json-body';

const app = new Koa();

app.use(body());

app.use(ctx => {
  const requestBody = ctx.request.body;
  // console.log(requestBody);
  const responseBody = {message: 'Hello, World!'};
  ctx.set('Content-Type', 'application/json');
  ctx.body = JSON.stringify(responseBody);
});

app.listen(3000);
