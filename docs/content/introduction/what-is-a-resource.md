### What is a resource?

In Run's world, a resource is a JSON (or YAML) document that allows representing almost anything: tools, configs, APIs,... Resources embrace the principles of object-oriented programming, they are composed of attributes and methods and can inherit from each other.

For example, let's create a resource that has a talent for mathematics – it can make additions. First, create a `@resource.json` file with the following content:

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

You can see that there is a `sum` method with two inputs and one output, this is the interface of the resource. Now, to perform an actual operation, you need an implementation. So let's create the `index.js` file as follows:

```js
module.exports = () => ({
  sum({a, b}) {
    return a + b;
  }
});
```

That is how you implement a resource in JavaScript. For such a simple method, it may seem a little cumbersome to have to write a resource definition so verbose, but as you'll see later, this extra work will allow you to achieve great things.

First of all, it is possible to invoke the resource directly from the shell:

```shell
run sum --a=1 --b=2
```

Nothing happens on the screen, and this is normal, the operation has been executed, but for the result to be displayed, you must add the `--@print` [CLI option](/docs/reference/run-cli):

```shell
run sum --a=1 --b=2 --@print
```

And here's the result:

```shell
3
```

Wonderful but let's try to improve the user's experience a little bit by adding some descriptions and arguments position:

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

A gorgeous help should appear on the screen:

![Math example help screen](${DOCS_BASE_URL}/images/math-example-help.png)

And finally, it is possible to execute the command in a much more appealing way:

```shell
run sum 1 2 --@print
```

Too easy? I agree, let's go a little further by composing some resources together.
