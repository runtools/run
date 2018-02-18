### Resource composition

Most of the time, you don't create your resources from scratch, you want to build them upon exiting ones. This can be done in two ways: loading or importing.

#### Loading resources

Imagine having to manage different configuration files depending on your deployment environment. You want to create three configuration files: one for the test environment, one for the production environment and one that is common to all environments. Using resources, you can achieve this quite easily.

First, create the common resource, simply named `@resource.json`:

```json
{
  "projectName": "My awesome project",
  "version": "0.1.0",
  "author": "email@domain.com",
  "deploy": {
    "@type": "method"
  }
}
```

You can see that this resource is setting several attributes (`projectName`, `version`,...) that are unrelated to the deployment environment. The resource also defines a `deploy` method.

Then, create a resource named `@resource.dev.json` for the test environment, and use `@load` to inherit from the common resource:

```json
{
  "@load": "./@resource.json",
  "domainName": "dev.awesome.com",
  "database": {
    "host": "db.dev.awesome.com",
    "username": "dev",
    "password": "*******"
  }
}
```

Finally, create a resource named `@resource.prod.json` for the production environment:

```json
{
  "@load": "./@resource.json",
  "domainName": "awesome.com",
  "database": {
    "host": "db.awesome.com",
    "username": "prod",
    "password": "*******"
  }
}
```

Now, if you want to deploy to the test environment, you just invoke:

```shell
run ./@resource.test.json deploy
```

And for the production environment:

```shell
run ./@resource.prod.json deploy
```

#### Importing resources

When you use `@load`, you inherit all the properties from the source, but sometimes you just want to inherit a part of it. To achieve this, you can use `@import` which will get only the properties contained in the `@export` part of the source.

This is very useful when you need to use some tools in order to produce other tools or libraries. Some package managers (e.g., npm) solve this case by using some sort of "development dependencies". Thanks to resources, there is a much more elegant way.

For example, here is a fictional tool to launch some sort of task:

```json
{
  "builder": {
    "@implementation": "./builder.js",
    "source": "./src",
    "destination": "./dist",
    "build": {
      "@type": "method"
    }
  },
  "tests": {
    "@implementation": "./tests/index.js",
    "source": "./dist",
    "run": {
      "@type": "method"
    }
  },
  "@export": {
    "@implementation": "./dist/main.js",
    "launchTask": {
      "@type": "method"
    }
  }
}
```

Here, the `builder` and `tests` subresources are only useful during the development phase, they are not what we want to expose to the consumers of the resource. We want to expose only the `launchTask` method, that's why we put it in the `@export` section.

Now, by importing the tool:

```json
{
  "@import": "./tool.js"
}
```

We get only the `launchTask` method, and we don't need to worry about all the details of its creation or implementation.

`@load` and `@import` are simple but very powerful features to compose rich resources mixing different programing languages (only JavaScript for now) and execution environments (local or remote).
