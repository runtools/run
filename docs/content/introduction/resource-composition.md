### Resource composition

Most of the time, you don't create your resources from scratch; you build upon existing ones. That can be done in two ways: by loading or importing.

#### Loading resources

You might have to manage different configuration files depending on your deployment environment. You want to create three configuration files: one for the test environment, one for the production environment, and one common to all environments. Using resources, you can achieve this quite easily.

First, create the common resource and simply name it `@resource.json`:

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

You can see that this resource sets several attributes (`projectName`, `version`, etc.) that are unrelated to the deployment environment. The resource also defines the `deploy` method.

Then, create a resource named `@resource.dev.json` for the test environment, and use `@load` to inherit its properties from the common resource:

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

For the production environment, you invoke:

```shell
run ./@resource.prod.json deploy
```

You got it. `@load` is an easy way to share code with multiple resources.

#### Importing resources

When you use `@load`, you inherit all the properties from the source, but, sometimes, you might want to inherit only some of them. To achieve this, you can use `@import`, which will fetch only the properties contained in the `@export` section of the source.

That is useful when you need to use some tools in order to produce other tools or libraries. Some package managers (e.g., npm) solve this case by using some "development dependencies." Thanks to resources, there is a much more elegant way.

For example, here is a tool to launch a fictional rocket:

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
    "launchRocket": {
      "@type": "method"
    }
  }
}
```

Here, the `builder` and `tests` subresources are only useful during the development phase, and they are not what we want to expose to the consumer of the resource. To expose just the `launchRocket` method, we put it in the `@export` section.

Now, we import the tool:

```json
{
  "@import": "./tool.js"
}
```

By doing this, we get only the `launchRocket` method, and we don't need to worry about all the details of its creation or implementation.

`@load` and `@import` are simple but powerful features to compose rich resources that mix different programming languages and execution environments.
