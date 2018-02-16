### Hello, @resources!

A @resource is a new kind of document allowing to describe almost anything: tools, APIs, configs, libraries,... Embracing the principles of object-oriented programming, @resources are composed of attributes and methods, and they can inherit from each other.

For example, here is a @resource describing a website hosted by AWS:

```
{
  "frontend": {
    "@import": "aws/s3-hosted-website",
    "domainName": "www.example.com"
  },
  "backend": {
    "@import": "aws/lambda-hosted-resource",
    "domainName": "api.example.com",
    "@export": {
      "hello": { "@type": "method" }
    }
  }
}
```

Our @resource is composed of two sub-@resources: `"frontend"` which inherits from `"aws/s3-hosted-website"`, and `"backend"` which inherits from `"aws/lambda-hosted-resource"`. An exciting feature of @resources is that they can be invoked remotely. By inheriting from `"aws/lambda-hosted-resource"`, the backend will run on AWS Lambda.

Here is the implementation of the frontend:

```
<!DOCTYPE html>
<html>
  <body>
    <script type="module">
      import Resource from 'https://unpkg.com/run-core?module';
      (async () => {
        const backend = await Resource.$import('https://api.example.com');
        document.body.innerText = await backend.hello();
      })();
    </script>
  </body>
</html>
```

Once the backend has been imported with `Resource.$import()`, the `hello()` method is available in the browser, and although it runs on the server side, it can be invoked as if it were defined locally.

And here is the implementation of the backend which is pretty straightforward:

```
export default base =>
  class Backend extends base {
    async hello() {
      return 'Hello, @resources';
    }
  };
```

Finally, we can use `run` (the @resource runtime) to interact with the @resource. Deploying the website to AWS is as simple as:

```
$ run frontend deploy && run backend deploy
```

Voilà! Our website is online. With minimal effort, the frontend is served by S3 and CloudFront, the backend runs in Lambda, domain names are managed by Route 53, and SSL certificates have been created by ACM.
