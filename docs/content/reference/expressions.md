### Expressions

An expression is a convenient way to explore resources and to invoke some methods. When you use [Run CLI](/docs/reference/run-cli), you are evaluating some expressions.

For example, with the following resource:

```json
{
  "database": {
    "username": "admin",
    "password": "******"
  },
  "deploy": {
    "@type": "method",
    "@input": {
      "domainName": {
        "@type": "string",
        "@position": 0
      },
      "optimize": {
        "@default": false
      }
    }
  }
}
```

You can invoke expressions such as:

```bash
run database # Returns the database subresource
```

```bash
run database username @print # Prints the database's username
```

```bash
run deploy api.domain.com --optimize  # Invokes the deploy method
```

Expressions can also be used in methods using the `@before`, `@run` and `@after` attributes:

```json
{
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

If you're a bit familiar with the command line, you should be able to intuit how to write expressions. The syntax is not intended to be as powerful as a shell such as [Bash](https://www.gnu.org/software/bash/), the idea is to support the bare minimum to provide the user with a simple and productive way to control his resources. For more advanced operations, we think it is better to use a full-featured programming language, and write an actual resource `@implementation`.

#### Subexpressions

An expression can use parentheses to include subexpressions. That is useful for chaining multiple method invocations.

Example:

```json
{
  "dinnerAlert": {
    "@type": "method",
    "@run": "(@import tool/notifier#^0.1.0) notify 'Dinner is ready!'"
  }
}
```

It is also possible to use parentheses in the command line, but make sure to escape them with a `\`:

```shell
run \(getUser 123\) @print
```
