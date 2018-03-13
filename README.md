# Run

This is [Run](https://run.tools)'s monorepo.

## What is Run?

When we work on a project, we usually use several tools such as (in the case of a modern web project), a dependency manager, a transpiler, a bundler, etc. So we need a way to install, configure and compose all these tools. Unfortunately, our good old command line is not very good at this. The interface of the executables is not quite user-friendly, and since typical shells cannot handle several versions of the same tool, managing our development environment is painful when we have to deal with many projects.

Run solves these problems by introducing the concept of [resource](https://run.tools/docs/introduction/what-is-a-resource). A resource adds an object-oriented interface to the tools, making them easier to use both from the command line and, programmatically, from other tools. Using inheritance and composition, it is possible to define projects composed of several tools in an elegant way. Also, since Run installs tools automatically, we get development environments that are easily transportable and shareable.

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

The full documentation can be found here:

[https://run.tools/docs](https://run.tools/docs)

## Contributing

Contributions are more than welcome. Before contributing please read the
[code of conduct](https://github.com/runtools/run/blob/master/CODE_OF_CONDUCT.md) &
[search the issue tracker](https://github.com/runtools/run/issues); your issue
may have already been discussed or fixed in `master`. To contribute,
[fork](https://help.github.com/articles/fork-a-repo/) Run, commit your changes,
& [send a pull request](https://help.github.com/articles/about-pull-requests/).

## License

MIT
