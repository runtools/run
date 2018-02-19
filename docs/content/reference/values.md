### Values

A “value” is a special kind of resource that can hold a value of a certain type.

To create such a value-resource, use the `@type` attribute:

```js
{
  "name": {
    "@type": "string" // name is an undefined "string" value
  }
}
```

When an actual value (or default value) is specified, you don't need to indicate a type, it can generally be inferred from the value:

```js
{
  "name": "Bob", // => "string"
  "age": 25, // => "number"
  "isNice": true // => "boolean"
}
```

For now, the supported types of value are: `"boolean"`, `"number"`, `"string"`, `"array"`, `"object"` and `"binary"`. More types are expected to come in the future (e.g., `"date"`).

#### Value attributes

##### @value

The `@value` attribute allows to specify the actual value of a resource.

Example:

```js
{
  "name": {
    "@value": "Bob"
  }
}
```

Most of the time, you don't use the `@value` attribute explicitly. It is much easier to specify the actual value directly:

```js
{
  "name": "Bob"
}
```

##### @default

Just like `@value`, the `@default` attribute gives an actual value to a resource, with the added bonus that this value will appear in the auto-generated help.

Example:

```js
{
  "isNice": {
    "@default": true // This default value will appear in the help
  }
}
```
