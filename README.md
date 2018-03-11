# Run

This is [Run](https://run.tools)'s monorepo.

## What is Run?

When we work on a project, we usually use several tools such as (in the case of a web project), a dependency manager, a transpiler, a bundler, a deployment tool, etc. So we need a way to install, configure and compose all these tools. Unfortunately, our good old Unix-based systems are not very good at this; it is difficult to install several versions of the same tool, and the interface of the executables is too rudimentary. Configuring (heterogeneous set of config files) and running (argv) such tools is not quite user-friendly.

Run tries to solve this problem by introducing the concept of resource. A resource is based on object-oriented principles and allows to group in the same coherent unit the configuration part (attributes) and the invocation part (methods) of a tool. On this foundation, it is possible to configure and compose a new generation of tools in a simple and elegant way. Adding the fact that Run installs (and updates) tools automatically, we get development environments that are easily transportable and shareable.

## Installation

Install Run using [npm](https://www.npmjs.com/) ([Node.js](https://nodejs.org/) v6 or later) on macOS or Linux (Windows will come soon):

```shell
npm install run-cli -g
```

Ensure that it is correctly installed:

```shell
run @version
```

You should see the current version of `run-cli` and `run-core`.

So, you are all set, and that was the last time you had to install a tool in your life.

## Hello, World!

Let's get started by writing a simple "Hello, World!" resource. First, create a file named `@resource.json` with the following content:

```json
{
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

Then, invoke Run:

```shell
run
```

You should see a description of the resource you just created, that is, the online help. When you invoke Run without any arguments, you get a handy help showing what the current resource is capable of. In the present case, there is only one method exposed: `hello`. So let's invoke it:

```shell
run hello
```

Voila! You wrote your first resource. 🎉

## Documentation

Full documentation can be found here:

[https://run.tools/docs](https://run.tools/docs)

## License

MIT
