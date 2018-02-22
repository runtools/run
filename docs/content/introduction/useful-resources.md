### Useful resources

The development of resources has just started, but there are already a few that you might find interesting to experiment. They are all published on [Resdir](${RESDIR_WEBSITE_URL}), so you can import them easily:

```js
{
  "@import": "namespace/name#^0.1.0"
}
```

#### Base resources

* [resdir/resource](https://github.com/resdir/resdir/tree/master/resources/resdir/resource): The base resource for all resources published on Resdir.
* [js/resource](https://github.com/resdir/resdir/tree/master/resources/js/resource): A starting point for resources implemented in JavaScript.
* [js/npm-package](https://github.com/resdir/resdir/tree/master/resources/js/npm-package): Base resource to create and publish npm packages.

#### JavaScript development tools

* [js/npm-dependencies](https://github.com/resdir/resdir/tree/master/resources/js/npm-dependencies): Manage npm package dependencies.
* [js/transpiler](https://github.com/resdir/resdir/tree/master/resources/js/transpiler): JavaScript transpiler (using Babel).
* [js/bundler](https://github.com/resdir/resdir/tree/master/resources/js/bundler): JavaScript module bundler (using Rollup).

#### Hosting

* [aws/s3-hosted-website](https://github.com/resdir/resdir/tree/master/resources/aws/s3-hosted-website): Host a static website on AWS using S3, CloudFront, Route 53 and ACM.
* [aws/lambda-hosted-resource](https://github.com/resdir/resdir/tree/master/resources/aws/lambda-hosted-resource): Host resources on AWS using Lambda, API Gateway, Route 53 and ACM.

#### Other tools

* [tool/file-copier](https://github.com/resdir/resdir/tree/master/resources/tool/file-copier): A simple tool to copy a list of files.
* [tool/notifier](https://github.com/resdir/resdir/tree/master/resources/tool/notifier): Display native Desktop notifications (uses 'node-notifier').
* [website/freezer](https://github.com/resdir/resdir/tree/master/resources/website/freezer): Rename static website files to make them more cacheable (experimental).
