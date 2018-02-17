### What is a resource?

In Run's world, a resource is a JSON (or YAML) document that allows to represent almost anything: documents, configs, tools, APIs, libraries,... Embracing the principles of object-oriented programming, a resource is composed of attributes and methods, and can inherit from (or embed) another resources.

For example, to create a resource capable of making an addition, your `@resource.json` file could look like this:

```json
{
  "@implementation": "./index.js",
  "sum": {
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

You can see that there is a `sum` method with two inputs and one output. This is the interface of the resource, but to perform an actual sum operation, we need an implementation. So let's create the `index.js` file as follows:

```js
module.exports = () => ({
  sum({a, b}) {
    return a + b;
  }
});
```

This is how you would implement a resource in JavaScript. For such a simple method, it may seem a little boring to have to write – in addition to the implementation – a resource definition so verbose. Well, as you'll see later, this little extra work will allow you to achieve great things.

To begin with, it is possible to invoke your resource directly from the shell:

```shell
run sum --a=1 --b=2
```

Nothing happens on the screen but this is normal, the operation has been executed but for the result to be displayed, you must use the `@print` command:

```shell
run { sum --a=1 --b=2 } @print
```

And here's the result:

```shell
3
```

Wonderful but let's try to improve the UX a little bit by adding descriptions to the resource and specifying the position of the arguments:

```json
{
  "@implementation": "./index.js",
  "sum": {
    "@type": "method",
    "@description": "Compute the sum of two numbers",
    "@input": {
      "a": {
        "@type": "number",
        "@description": "The first number",
        "@position": 0
      },
      "b": {
        "@type": "number",
        "@description": "The second number",
        "@position": 1
      }
    },
    "@output": {
      "@type": "number",
      "@description": "The result of the operation"
    }
  }
}
```

Now, by invoking:

```shell
run @help sum
```

A gorgeous help should appear on the screen (with colors if you are using a real terminal):

![Math example help screen](${DOCS_BASE_URL}/images/math-example-help.png)

```shell
sum (method)
Compute the sum of two numbers

Input

  Attributes:
    a (number)  The first number (position: 0)
    b (number)  The second number (position: 1)

Output

number
  The result of the operation
```

And finally, it is possible to execute the command in a much more appealing way:

```shell
run { sum 1 2 } @print
```
