### Expressions

An expression is a convenient way to access resource attributes and invoke methods. When you use Run CLI, you are actually evaluating expressions.

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
run database # Returns database subresource
```

```bash
run database username @print # Prints database's username
```

```bash
run deploy api.domain.com --optimize  # Invokes deploy method
```

Using the `@before`, `@run` or `@after` attribute, expressions can also be used in methods:

```json
{
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

This is it. If you're a bit familiar with a shell, you should know how to write an expression. The syntax is not intended to be as powerful as a shell such as [Bash](https://www.gnu.org/software/bash/), the idea is to support the bare minimum syntax to provide the user with a simple and productive way to control its resources. For more advanced operations, we think it is better to use a real programming language, and write a resource `@implementation`.

### Subexpressions

Using parentheses, an expression can include subexpressions. This is useful for chaining multiple method invocations.

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
