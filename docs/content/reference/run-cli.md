### Run CLI

Using the Run's command line interface is quite straightforward, just invoke `run` followed by an [expression](/docs/reference/expressions).

Examples:

```
run @console print 'Hi there!'
```

```
run database restore --timestamp=1519032678
```

```
run \(getUser 123\) sendMessage 'Konnichiwa!'
```

#### Options

For now, the Run CLI has only one option.

##### --@print

The `--@print` option is a convenient way to print the output of an expression.

Using the `@print` resource built-in method, it is possible to achieve the same result, but in some cases it is more convenient to use the `--@print` option.

For example, to print the output of a method, it might be possible to do:

```
run (getUser 123) @print
```

Unfortunately, the shell interprets the parentheses for its own use, so it is necessary to escape them:

```
run \(getUser 123\) @print
```

In this case, it is probably easier to use the `--@print` option:

```
run getUser 123 --@print
```
