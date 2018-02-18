### Sharing a resource

Creating resources is good but sharing them is even better. Whether publicly to the developer community or privately to your colleagues in your company, resources benefit from sharing. To do so, Run can rely on a “resource registry”. The first to be developed is [Resdir](${RESDIR_WEBSITE_URL}). Although it is still in an early stage of development, if you feel like a pioneer, you will be happy to use it.

#### Signing up for a resource registry

To access to the default registry (Resdir), the easiest way is to use the built-in command `@registry`:

```shell
run @registry
```

This should display the in-line help. To sign up, the command to use is:

```shell
run @registry signUp
```

After verifying your email address, you will be asked to choose a namespace. This choice is important because all your published resources will reside in this namespace. For example, if your namespace is `"aturing"`, you will be able to publish a resource using `"aturing/nice-tool"` as identifier. Later on, you will have the possibility to create namespaces for organizations and communities, but this is another topic.

#### Publishing a resource

Let's try to publish the resource you created in the [Getting started](/docs/introduction/installation-and-hello-world) section, the famous "Hello, World!".

First, you need to `@import` Resdir's base resource:

```json
{
  "@import": "resdir/resource#^0.1.0"
}
```

In the resource specifier `"resdir/resource#^0.1.0"`, there are a resource identifier (`"resdir/resource"`) and a version range (`"^0.1.0"`). Don't worry too much about the version range for the moment, just remember that it is a good practice to always specify it. This ensures that your resource will keep working in the future, even if there are breaking changes in the resources you rely on.

Now that your resource is inheriting from `"resdir/resource"`, you can check the in-line help to see what new possibilities are available to you. To do so, just invoke Run without any arguments:

```shell
run
```

You can see all the available attributes and among them there are two that are mandatory – `id` and `version`. So let's add them:

```json
{
  "@import": "resdir/resource^0.1.0",
  "id": "aturing/nice-tool",
  "version": "1.0.0"
}
```

Finally, complete your resource by writing the actual "implementation":

```json
{
  "@import": "resdir/resource^0.1.0",
  "id": "aturing/nice-tool",
  "version": "1.0.0",
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

Your resource is ready to be published. So let's do it:

```shell
run publish
```

This is it. Your resource is now stored in the resource registry. To consume it, just reference it by its identifier. You can `@load` or `@import` it from another resource, or simply invoke it from the CLI:

```shell
run aturing/nice-tool hello
```

One last word. By default, the resources your publish are private, so only you have access to them. To make a resource publicly available, set its `isPublic` attribute to `true`.
