### What is a resource?

#### The problem

Typically, when we work on a project, we use several tools such as (in the case of a modern web project), a dependency manager, a transpiler, a bundler, etc. So we need a way to install, configure and compose all these tools. Unfortunately, our good old command line is not very good at this.

To configure our tools, we use configuration files based on many different formats. We communicate with tools through an array of strings (`argv`). To compose several tools, there is, well, [Bash](https://www.gnu.org/software/bash/)... Finally, since typical shells can't handle several versions of the same tool, managing our development environment is painful when we have to deal with many projects.

Seriously, we cannot say that it's user-friendly.

#### The solution

A resource adds an object-oriented interface to the tools, making them easier to use both from the command line and, programmatically, from other tools.

If you create a tool, you can wrap it into a resource to improve its usability and save a lot of development time. First, since Run installs tools automatically, the installation problem disappears. Then, given that users configure tools using resources, you don't need to manage configuration files. Finally, you no longer need to implement a command line interface; Run provides it for you.

If you are an end-developer, and you are working on an application, website, backend, etc., you can use a resource to reference the tools your project needs and specify their configuration. Then, since your development environment is defined in a single file, your project is super easy to transport and share. Just grab the resource and you are all set. Also, since your resource consumes tools that are themselves resources, everything becomes extremely easy to configure, compose, and use.

#### What does it look like?

Basically, a resource is a JSON or YAML document allowing you to specify the following:

• The tools that the resource consumes (by inheriting or composing them),  
• A set of attributes (to configure the tools),  
• A set of methods (to add custom behaviors).

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
run . sum --a=1 --b=2
```

Nothing happens on the screen, and this is normal; the operation has been executed, but for the result to be displayed, you must add the `--@print` [CLI option](/docs/reference/run-cli):

```shell
run . sum --a=1 --b=2 --@print
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
run . @help sum
```

A gorgeous help should appear on the screen:

![Math example help screen](/docs/images/math-example-help.png)

And finally, it is possible to execute the command in a much more appealing way:

```shell
run . sum 1 2 --@print
```

Too easy? I agree, let's go a little further by composing some resources together.
