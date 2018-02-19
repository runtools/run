### Events

It is possible to emit events to a resource in order to trigger the execution of certain methods.

For example, with a resource such as:

```json
{
  "build": {
    "@type": "method",
    "@listen": "deploy"
  }
}
```

Since the `build` method is listening the event `"deploy"`, it is possible to trigger its execution by doing:

```shell
run @emit deploy
```

Quite often, you want to emit an event to a resource while including all its child resources. In this case, the @broadcast method is very helpful. For example, with the following resource:

```json
{
  "frontend": {
    "deploy": {
      "@type": "method",
      "@listen": "deployAll"
    }
  },
  "backend": {
    "deploy": {
      "@type": "method",
      "@listen": "deployAll"
    }
  }
}
```

You can invoke the `deploy` method for both the frontend and the backend by broadcasting the event `"deployAll"`:

```shell
run @broadcast deployAll
```
