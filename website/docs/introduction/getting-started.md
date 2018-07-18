### Getting started

#### Installation

To install (or update) Run on macOS or Linux (Windows support will come later), invoke the following command in the terminal:

```shell
curl https://install.run.tools | bash
```

Then, open a new terminal session to make the `run` command available.

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
run .
```

You should see a description of the resource you just created, that is, the online help. The dot (`.`) is a shortcut for the resource presents in the current directory. When you invoke Run without any commands, you get a handy help showing what the specified resource is capable of. In the present case, there is only one thing exposed: the `hello` method. Let's invoke it:

```shell
run . hello
```

Voila! You wrote your first resource. 🎉
