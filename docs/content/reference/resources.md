### Resources

In the resource's world, everything is a resource. So when we refer to a resource, we mean the root of a resource or anything inside (attributes, methods, subresources, etc.).

For example :

```js
{
  // A resource at the root level
  "database": {
    // A (sub)resource
    "username": "admin", // "username" is also a resource (of type "string")
    "password": "******" // And yet another resource...
  },
  "deploy": {
    "@type": "method"
    // A method is also a resource
  }
}
```

#### Resource attributes

All resources share a number of attributes.

##### @type

The `@type` attribute allows to specify the type of a resource. The base type is `"resource"` and from it are built several subtypes such as `"string"`, `"number"`, etc.

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

The currently available types are: `"resource"` (default), `"boolean"`, `"number"`, `"string"`, `"array"`, `"object"`, `"binary"` and `"method"`.

##### @load

The `@load` attribute allows to specify one or more resources from which the current resource should inherit.

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

Using `@load`, you can inherit from this base resource:

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

* You can use a path to a local file (e.g., `"./person.js"`). That can be an absolute or a relative path. In the case of a relative path, be careful to always start with `"./"` (the current directory) or `"../"` (the parent directory).
* You can use a specifier to load a resource stored in a registry (e.g., `"my-namespace/person#^1.0.0"`). A resource specifier is composed of an identifier (`"my-namespace/person"`) and a version range (`"^1.0.0"`). The version range is optional but strongly recommended. We use (almost) the same specifications as [npm's version range](https://docs.npmjs.com/files/package.json#dependencies), so until further documentation is available, please refer to it.
* You can specify the URL of a remote resource (e.g., `"https://person.api.my-domain.com"`). In this case, any method call will trigger a remote invocation.

Finally, if you want to load more than one resource, just use an array:

```json
{
  "@load": ["js/resource#^0.1.0", "./person.json"]
}
```

##### @import

Like `@load`, the `@import` attribute allows inheriting from one or more resource. The difference is that when you use `@import`, you don't inherit a full resource from its root, you only inherit the part contained in the `@export` section.

For example, if you `@import` the following resource:

```json
{
  "id": "my-namespace/person",
  "version": "1.0.0",
  "@export": {
    "name": {
      "@type": "string"
    },
    "age": {
      "@type": "number"
    }
  }
}
```

You will not get `id` and `version` attributes, you will get only `name` and `age`.

##### @export

The `@export` attribute allows to specify the exported part of a resource. It works in conjunction with the `@import` attribute that is documented just above.

##### @runtime

The `@runtime` attribute allows to specify the runtime used to run a resource's implementation. For now, only the [Node.js](https://nodejs.org/) runtime is available.

Example:

```json
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

```json
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

To create a JavaScript implementation (the only language supported for now), you must export a function that returns an object containing each implemented method.

The above example could be implemented as follows:

```js
module.exports = () => ({
  add({a, b}) {
    return a + b;
  }
});
```

Or using ES6 modules:

```js
export default () => ({
  add({a, b}) {
    return a + b;
  }
});
```

Each method receives an `@input` resource as the first argument and can return anything that is compatible with the defined `@output` resource. If a method returns a `Promise` (or is an ES6 `async` function), the resource runtime automatically handles it.

Using `this`, you can call another method defined in the same resource or any base resource (inherited with `@load` or `@import`). When you call a method, you should always use `await` (or handle the `Promise` manually) because you shouldn't presume how and where a method is executed. Il could be executed locally – in a different language runtime – or even remotely on a [different machine](/docs/introduction/remote-invocation). So, be sure to always handle the promises:

```js
module.exports = () => ({
  async deploy() {
    await this.deployFrontend();
    await this.deployBackend();
  }
});
```

Finally, to call an overridden method (i.e., a method already implemented in a base resource), you can use `super`:

```js
module.exports = () => ({
  async add({a, b}) {
    return await super.add({a, b}); // Call the overridden method
  }
});
```

##### @directory

The `@directory` attribute allows to specify the current directory of a resource. The current directory is used to resolve relative paths, and some tools are using it to fetch or install local files (i.e., `"js/npm-dependencies"`). By default, the current directory is the same directory as the resource file, but it is sometimes useful to specify another directory.

Example:

```js
{
  "testDependencies": {
    "@directory": "./tests",
    "@implementation": "./main.js", // The actual path is './tests/main.js'
    "@import": "js/npm-dependencies#^0.1.0" // The dependencies will be installed in ./tests/node_modules
  }
}
```

##### @name

The `@name` attribute allows to specify a name for a resource. A good name should be pleasant to read for humans. For example, instead of `"awesome-website"`, you should use something more like `"Awesome Website"`. The name is the first information that is displayed in the auto-generated help, and this name might also appear when you publish a resource to a registry.

Example:

```json
{
  "@name": "Awesome Website",
  "id": "my-namespace/awesome-website",
  "version": "1.0.0"
}
```

##### @description

The `@description` attribute allows to specify a short description for the current resource. That can be used to describe any type of resource, including methods, parameters, etc. When the `@description` is defined at the root of a resource, it appears in the auto-generated help after the `@name`, and it might also be used when you publish a resource to a registry.

Example:

```json
{
  "@name": "Awesome Website",
  "@description": "The most beautiful site in the universe"
}
```

##### @aliases

The `@aliases` attribute allows to specify aliases for child resources (attributes, methods, or any subresources). These aliases can improve the user's experience on the command line. Instead of using a child's key, the user may prefer to use an alias that is shorter or more meaningful given the context.

For example, `resdir/registry-client` (the default `@registry`) uses aliases for the `currentUser` subresource:

```json
{
  "currentUser": {
    "@description": "It's all about you",
    "@aliases": ["me", "my"],
    "show": {
      "@type": "method",
      "@description": "Display some information about your Resdir account"
    },
    "organizations": {
      "@description": "Manage the organizations you belong to",
      "@aliases": ["organization", "orgs", "org"],
      "list": {
        "@type": "method",
        "@description": "List the organizations you belong to",
        "@aliases": ["ls"]
      }
    }
  }
}
```

Thanks to these aliases, the user can do:

```bash
run @registry me show
```

Or:

```bash
run @registry my orgs ls
```

##### @examples

The `@examples` attribute can be used to document a resource. Examples can appear in any type of resource (including methods and parameters), and they are displayed in the auto-generated help.

Example:

```json
{
  "aws": {
    "region": {
      "@description": "The AWS region in which your resource must be hosted",
      "@examples": ["us-west-1", "eu-west-3", "ap-northeast-1"],
      "@default": "us-east-1"
    }
  }
}
```

##### @position

The `@position` attribute allows to specify the position of method arguments in the command line. A position is defined by a number starting from `0`.

Example:

```json
{
  "add": {
    "@type": "method",
    "@input": {
      "a": {
        "@type": "number",
        "@position": 0
      },
      "b": {
        "@type": "number",
        "@position": 1
      }
    },
    "@output": {
      "@type": "number"
    }
  }
}
```

Now instead of doing this:

```bash
run add --a=7 --b=3
```

The user can just do:

```bash
run add 7 3
```

##### @isOptional

The `@isOptional` attribute allows to specify whether a method parameter is optional or not. By default, all method parameters are required. To make a parameter optional, set `@isOptional` to `true`.

Example:

```js
{
  "deploy": {
    "@type": "method",
    "@input": {
      "target": {
        // This parameter is required
        "@type": "string"
      },
      "optimize": {
        // This parameter is optional
        "@type": "boolean",
        "@isOptional": true
      },
      "region": {
        // This parameter is also optional because it has a default value
        "@default": "us-east-1"
      }
    }
  }
}
```

##### @isVariadic

The `@isVariadic` attribute allows defining a variadic method parameter (i.e., a parameter that can hold one or more values). It is only useful in the context of the command line, and it only works with positional parameters (i.e., using `@position`) of type `"array"`.

For example, the following method:

```json
{
  "transpile": {
    "@type": "method",
    "@input": {
      "files": {
        "@type": "array",
        "@position": 0,
        "@isVariadic": true
      }
    }
  }
}
```

Can be invoked with several `files`:

```bash
run transpile main.js database.js
```

##### @isHidden

The `@isHidden` attribute allows hiding a resource's child from the auto-generated help. It can be used to hide an attribute, a method, a parameter or any subresource.

Example:

```js
{
  "account": {
    "show": {
      "@type": "method"
    },
    "delete": {
      // Too dangerous, let's hide this method from the help
      "@type": "method",
      "@isHidden": true
    }
  }
}
```

##### @unpublishable

The `@unpublishable` attribute allows to specify a section of a resource that should be ignored when the resource is published to a registry. It is useful to avoid some private information to be published or to lighten a resource of things that are used only during the development phase (e.g., builders, test suite, etc.).

Example:

```js
{
  "id": "my-namespace/my-tool",
  "version": "1.0.0",
  "@export": {
    // ...
  },
  "@unpublishable": {
    // This section doesn't need to be published
    "transpiler": {
      "@import": "js/transpiler#^0.1.0"
    },
    "tests": {
      "@import": "1place/jest#^0.1.0",
      "@directory": "./tests"
    }
  }
}
```

##### @comment

The `@comment` attribute allows to write a comment in a resource. Such a comment is only visible to a developer reading the resource file.

Example:

```json
{
  "id": "my-namespace/my-tool",
  "version": "1.0.0",
  "@comment": "TODO: complete the implementation"
}
```
