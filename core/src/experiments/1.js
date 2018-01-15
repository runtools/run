/* eslint-disable */

import Resource from '../browser';

(async () => {
  const resource = await Resource.$import('https://api.hello.resdir.com');
  console.log(await resource.hello());
})();

// class Person {
//   set age(val) {
//     console.log(val);
//     return 'promise';
//   }
// }
//
// const p = new Person();
//
// const r = (p.age = 40);
// console.log(r);

// const o1 = {a: 1, b: 2};
//
// const o2 = {...o1};

// class A {
//   static a = 123;
//   static b = A.a;
// }
//
// console.log(A.b);

// import {removeSync} from 'fs-extra';
// import {load, save} from '@resdir/file-manager';
//
// let data = load('$resource.json5');
// data = JSON.stringify(data, undefined, 2);
// data = data.replace(/"\$(\w+)":/g, (_match, key) => {
//   return `"@${key}":`;
// });
// console.log(data);
// save('@resource.json', data, {stringify: false});
// removeSync('$resource.json5');

// class A {
//   async hello() {
//     return 'Hello from A';
//   }
//
//   async '@test'() {
//     console.log('Test');
//   }
// }
//
// class B extends A {
//   async hello() {
//     return (await super.hello()) + ' > Hello from B';
//   }
// }
//
// (async () => {
//   const b = new B();
//   console.log(await b.hello());
//   b['@test']();
// })().catch(err => console.error(err));

/*

this.hello(); => We search an implementation starting from the current receiver

super.hello(); => We search an implementation starting from parents

*/

// class Resource {}
//
// function createResource({parent, implementation, methods}) {
//   const resource = new Resource();
//   resource.parent = parent;
//   resource.implementationClass = implementation(Object);
//
//   for (const methodName of methods) {
//     resource[methodName] = function() {
//       // <----
//     };
//   }
// }
//
// const parentImplementation = base =>
//   class extends base {
//     hello() {
//       console.log('hello');
//     }
//
//     greeting() {
//       this.hello();
//     }
//   };
//
// const childImplementation = base =>
//   class extends base {
//     hello() {
//       console.log('yep');
//       super.hello();
//     }
//   };
//
// const parent = createResource({
//   implementation: parentImplementation,
//   methods: ['hello', 'greeting']
// });

// const child = createResource({parent, implementation: childImplementation});
//
// child.greeting();
