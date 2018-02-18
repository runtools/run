### Remote invocation

When you `@import` (or `@load`) a resource, it doesn't matter in which language it is implemented or in which environment it is executed. It can run locally (on your machine) or remotely (on a server), and for the consumer of the resource, it is totally transparent.

This dramatically simplifies the development of client/server projects, since in most of the cases, you no longer need to develop REST APIs, RPC or whatever. The remote invocation issue is fully managed by the resource runtime.

Let's go back to the calculator resource and host it on AWS Lambda:

```json
{
  "@import": "aws/lambda-hosted-resource#^0.1.0",
  "domainName": "calculator.mydomain.com",
  "@export": {
    "@implementation": "./index.js",
    "add": {
      "@type": "method",
      "@input": {
        "a": {
          "@type": "number",
          "@position": 0
        },
        "b": {
          "@type": "number",
          "@position": 1
        }
      },
      "@output": {
        "@type": "number"
      }
    }
  }
}
```

All you had to do was to import `"aws/lambda-hosted-resource"`, specify a domain name and move the `add` method inside the `@export` section. The implementation (`index.js`) doesn't change.

Then, you can deploy your resource:

```shell
run deploy
```

And invoke it very easily:

```shell
run https://calculator.mydomain.com add 1 2 --@print
```

Of course, it is possible to import a remote resource from another resource (`{"@import": "https://calculator.mydomain.com"}`), and you can even import it (and invoke it) from any modern browser! 🤯
