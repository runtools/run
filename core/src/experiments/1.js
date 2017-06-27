/* eslint-disable */

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
