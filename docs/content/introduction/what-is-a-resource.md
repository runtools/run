### What is a resource?

When we work on a project, we usually use several tools such as (in the case of a web project), a dependency manager, a linter, a transpiler, a bundler, a deployment tool, etc. So we need a way to install, configure and compose all these tools. Unfortunately, operating systems are not very good at this. It is difficult to install several versions of the same tool, and the interface of the executables is very rudimentary. Whether it's configuration (heterogeneous config files) or invocation (argv), it is not quite user-friendly.

A resource is based on object-oriented principles and allows to encapsulate in the same coherent unit the configuration part (attributes) and the invocation part (methods) of a tool. On this foundation, it is possible to configure and compose a set of tools in a simple and elegant way. Adding the fact that Run installs (and updates) tools automatically, it is possible to create development environments that are easily transportable and shareable.

A resource can be stored in a JSON or YAML document, and be loaded directly by Run, or be referenced from another resource to be embedded or inherited.

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

You can see that there is a `sum` method with two inputs and one output; this is the interface of the resource. Now, to perform an actual operation, you need an implementation. So let's create the `index.js` file as follows:

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

Nothing happens on the screen, and this is normal; the operation has been executed, but for the result to be displayed, you must add the `--@print` [CLI option](/docs/reference/run-cli):

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
