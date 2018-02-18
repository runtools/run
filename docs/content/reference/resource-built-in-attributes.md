### Built-in attributes

In the resource model, everything is a resource. So when we refer to a resource, it means the root of a resource or any child resources (i.e., subresources).

For example :

```js
{
  // A resource at the root level
  "database": {
    // A (sub)resource
    "username": "admin", // "username" is also a resource (of type "string")
    "password": "******" // And yet another resource...
  }
}
```

#### General attributes

These attributes can be used in all types of resource.

##### @type

The `@type` attribute allows to specify the type of a resource. The base (and default) type is `"resource"` and from it are built several subtypes such as `"string"`, `"number"`, etc.

Example:

```json
{
  "name": {
    "@type": "string"
  },
  "age": {
    "@type": "number"
  },
  "play": {
    "@type": "method"
  }
}
```

Currently, the available types are: `"resource"` (default), `"boolean"`, `"number"`, `"string"`, `"array"`, `"object"`, `"binary"` and `"method"`.

When the value of a resource is known, you don't need to specify a type. It can usually be inferred from the value. For example:

```js
{
  "name": "Bob", // "string" is inferred
  "age": 25, // "number" is inferred
  "isNice": true // "boolean" is inferred
}
```

##### @load

The `@load` attribute allows to specify one or more resources from which the current resource inherits.

For example, here is a base resource:

```js
// person.json
{
  "name": {
    "@type": "string",
    "@description": "Name of the person"
  },
  "age": {
    "@type": "number",
    "@description": "Age of the person"
  },
  "play": {
    "@type": "method"
  }
}
```

Using `@load`, you can inherit from this base resource to create an instance resource:

```js
// bob.json
{
  "@load": "./person.json"
  "name": "Bob",
  "age": 25
}
```

Because `bob.json` inherits from `person.json`, it gets both the attributes `name` and `age` (inheriting their type and description), and the `play` method.

There are several ways to specify the resource you want to load:

* You can use a path to a local file (e.g., `"./person.js"`). This can be an absolute or a relative path. In the case of a relative path, be careful to always start with `"./"` (the current directory) or `"../"` (the parent directory).
* You can indicate a specifier to select a resource stored in a registry (e.g., `"my-namespace/person#^1.0.0"`). A resource specifier is composed of two parts: An identifier (`"my-namespace/person"`) and a version range (`"^1.0.0"`). The version range is optional but strongly recommended. We use (almost) the same specifications as [npm's version range](https://docs.npmjs.com/files/package.json#dependencies), so you can refer to it for more information.
* You can specify the URL of a remote resource (e.g., `"https://person.api.my-domain.com"`). In this case, any method call will trigger a remote invocation.

##### @import

Like `@load`, the `@import` attribute allows to inherit from another resource. The difference is that when you use `@import`, you don't inherit a full resource from its root, you only inherit the part contained in the `@export` section.

For example, if you `@import` the following resource:

```js
{
  "id": "my-namespace/person",
  "version": "1.0.0",
  "@export": {
    "name": {
      "@type": "string",
    },
    "age": {
      "@type": "number",
    }
  }
}
```

You will not get the `id` and `version` attributes, you will get only `name` and `age`.

##### @runtime

The `@runtime` attribute allows to specify the runtime used to run the implementation of a resource. For now, only the `"node"` runtime is available.

Example:

```js
{
  "@runtime": "node#>=6.10.0",
  "@implementation": "./dist/index.js",
  "play": {
    "@type": "method"
  }
}
```

##### @implementation

The `@implementation` attribute allows to specify the location of a resource's implementation.

For example:

```js
{
  "@implementation": "./dist/index.js",
  "add": {
    "@type": "method",
    "@input": {
      "a": {
        "@type": "number"
      },
      "b": {
        "@type": "number"
      }
    },
    "@output": {
      "@type": "number"
    }
  }
}
```

To implement a resource in JavaScript (the only language supported for now), you must export a function that returns an object containing all the methods defined in the resource.

The above example could be implemented as follows:

```js
module.exports = () => ({
  add({a, b}) {
    return a + b;
  }
});
```

Each method receives the `@input` resource as first parameter and can return anything that is compatible with the `@output` definition. If a method returns a promise (or is an ES6 `async` function), it is automatically handled by the resource runtime.

Finally, when a method overrides a method defined in a base resource (inherited with `@load` or `@import`), it can use `super` to call the overridden method:

```js
module.exports = () => ({
  add({a, b}) {
    return super.add({a, b});
  }
});
```

#### Value attributes

These attributes can be used in the following "value-type" resources: `"boolean"`, `"number"`, `"string"`, `"array"`, `"object"` and `"binary"`.

##### @value

The `@value` attribute allows to specify the value of a resource.

Example:

```js
{
  "name": {
    "@value": "Bob"
  }
}
```

Most of the time, you don't use the `@value` attribute explicitly. It is much easier to specify the value of a resource directly:

```js
{
  "name": "Bob"
}
```

##### @default

Just like `@value`, the `@default` attribute gives a value to a resource, with the added bonus that this value will appear in the auto-generated help as the default value.

Example:

```js
{
  "isNice": {
    "@default": true // This default value will appear in the in-line help
  }
}
```

#### Method attributes

These attributes can be used only in resources of type `"method"`.
