import request from 'then-request';

(async () => {
  console.time('requests');
  for (let i = 0; i < 1000; i++) {
    const response = await request('POST', 'http://localhost:3000', {
      json: {methodName: 'hello'},
      gzip: false
    });
    const body = response.getBody('utf8');
    // console.log(body);
  }
  console.timeEnd('requests');
})();

// import request from 'sync-request';
//
// console.time('requests');
// for (let i = 0; i < 1000; i++) {
//   const response = request('POST', 'http://localhost:3000', {
//     json: {methodName: 'hello'},
//     gzip: false
//   });
//   const body = response.getBody('utf8');
//   // console.log(body);
// }
// console.timeEnd('requests');
