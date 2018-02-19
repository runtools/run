### Methods

A method is a particular type of resource that can be invoked to perform some actions defined either by an expression (using `@before`, `@run` or `@after`) or by an implementation (using `@implementation`).

For example, here is a method using an expression:

```js
// @resource.json
{
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

And here is a method using an implementation:

```js
// @resource.json
{
  "@implementation": "./index.js",
  "hello": {
    "@type": "method"
  }
}
```

```js
// index.js
module.exports = () => ({
  hello() {
    console.log('Hello, World!');
  }
});
```

To write an implementation, only JavaScript is supported for now, but more languages will come soon.

#### Method attributes

##### @input

The `@input` attribute allows to define the input (i.e., the parameters) of a method. An input can be anything – a simple value such as a `"string"` or a resource composed of several attributes.

Example:

```json
{
  "notify": {
    "@type": "method",
    "@input": {
      "@type": "string"
    }
  },
  "sendEmail": {
    "@input": {
      "from": {
        "@type": "string"
      },
      "to": {
        "@type": "string"
      },
      "subject": {
        "@type": "string"
      },
      "message": {
        "@type": "string"
      }
    }
  }
}
```

By combining some resource attributes such as "@aliases", "@position" or "@default", you can define very powerful parameters:

```json
{
  "printError": {
    "@type": "method",
    "@input": {
      "message": {
        "@type": "string",
        "@aliases": ["msg"],
        "@position": 0,
        "@default": "An unknown error occurred"
      }
    }
  }
}
```

##### @output

The `@output` attribute allows to define the output of a method. An output can be anything – a simple value such as a `"string"` or a resource composed of several attributes.

Example:

```json
{
  "random": {
    "@type": "method",
    "@output": {
      "@type": "number"
    }
  }
}
```

And here is more complex output:

```json
{
  "getPerson": {
    "@type": "method",
    "@output": {
      "name": {
        "@type": "string"
      },
      "age": {
        "@type": "number"
      },
      "isFunny": {
        "@type": "boolean"
      }
    }
  }
}
```

##### @run

The `@run` attribute allows to specify an expression to execute when the method is invoked. For simple cases, it is a convenient way to define an action without having to write an implementation.

Example:

```json
{
  "hello": {
    "@type": "method",
    "@run": "(@import tool/notifier#^0.1.0) notify 'Hello there!'"
  }
}
```

Using an array, it is possible to execute a sequence of expressions:

```json
{
  "deploy": {
    "@type": "method",
    "@run": ["./frontend deploy", "./backend deploy"]
  }
}
```

##### @before

The `@before` attribute allows to specify an expression to run before the execution of a method.

Example:

```json
{
  "deploy": {
    "@type": "method",
    "@before": ["lint", "build", "test"]
  }
}
```

##### @after

The `@after` attribute allows to specify an expression to run after the execution of a method.

Example:

```json
{
  "deploy": {
    "@type": "method",
    "@after": "(@import tool/notifier#^0.1.0) notify 'Website deployed'"
  }
}
```

##### @listen

The `@listen` attribute allows to specify one or more events to be listened to by the current method. When a listened event is emitted (by `@emit` or `@broadcast`), the method is automatically invoked.

For example, with a resource like this:

```json
{
  "frontend": {
    "deploy": {
      "@type": "method",
      "@listen": "deployAll"
    }
  },
  "backend": {
    "deploy": {
      "@type": "method",
      "@listen": "deployAll"
    }
  },
  "deploy": {
    "@type": "method",
    "@run": "@broadcast deployAll"
  }
}
```

You can easily deploy both the frontend and the backend of your project:

```shell
run deploy
```
