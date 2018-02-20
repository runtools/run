### Remote invocation

When you `@load` (or `@import`) a resource, it doesn't matter in which language it is implemented or in which environment it is executed. It can run locally in a different runtime or remotely on a different machine, and for the consumer of the resource, it is entirely transparent.

That dramatically simplifies the development of client-server projects, since, in most of the cases, you no longer need to develop REST APIs, RPC or whatever. The resource runtime fully manages the remote invocation.

Let's go back to the calculator resource and host it on [AWS Lambda](https://aws.amazon.com/lambda/):

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

And invoke it:

```shell
run https://calculator.mydomain.com add 1 2 --@print
```

That's it. You have created a full client-server architecture with just one command.

Once a resource has been deployed, you can load it from another resource (`{"@load": "https://calculator.mydomain.com"}`), or even from a [browser](https://github.com/runtools/run/tree/master/examples/web-app)! 🤯
