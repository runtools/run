### Getting started

#### Installation

Install Run using [npm](https://www.npmjs.com/):

```shell
npm install run-cli -g
```

Ensure that it is correctly installed:

```shell
run @version
```

You should see the current version of `run-cli` and `run-core`.

So, you are all set, and that was the last time you had to install a tool in your life.

#### Hello, World!

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
