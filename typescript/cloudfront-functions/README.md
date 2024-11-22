# demo-cloudfront-functions

This project will create a S3 bucket with simple `html` files that will serve as our website source code, a
CloudFront distribution to serve this content as our CDN and, two CloudFront functions that will work upon the request
and response.

> This project is intended to be just a sample demonstration. Please, do not use it in production.

## CDK Toolkit

The `cdk.json` file tells the CDK Toolkit how to execute your app.

To start working with the project, first you will need to install all dependencies as well as the cdk module (if not
installed already). In the project directory, run:

```bash
$ npm install -g aws-cdk
$ npm install
```

## Deploying the solution

To deploy the solution, we will need to request cdk to deploy the stack:

```shell
$ cdk deploy --all
```

> **Note** that after running the deploy command, you will be presented and Output in the console like bellow:\
> `DemoCloudfrontFunctionsStack.DistributionDomainName = xxxxxxxx.cloudfront.net`\
> We will use this URL to access and test the website.

## Testing the solution

To begin the tests, you must have the distribution's URL (returned by cdk execution with the
name `DistributionDomainName`), and web browser capable of analysing Network requests and responses (e.g. Google Chrome
with Developer Tools enabled) or similar tool (e.g. curl, wget).

### Testing the index url

1. Access the base distribution URL
2. A return code 200 is returned
3. The response body will contain the text `It works!`

### Testing the index url with query strings

1. Access the base distribution URL, appending `?foo=bar` at its end
2. A return code 200 is returned
3. The response body will contain the text `It works!`

### Testing the test route

1. Access the base distribution URL, appending `/test` or `/test.html` at its end
2. A return code 308 (permanent redirect) is returned
3. The url will have changed to `/subdir/test.html`
4. A return code 200 is returned
5. The response body will contain the text `This is a test file for you`

### Testing the invalid route

1. Access the base distribution URL, appending `/invalid` at its end
2. A return code 403 is returned
3. There won't be any response body

### Other test cases

You can explore the `/reources/functions/request-function.js` and `/reources/functions/response-function.js` for
more handling rules. Some of them are validated through _CloudWatch Logs_ and _X-Ray_ given their nature.

## Destroying the deployment

To destroy the provisioned infrastructure, you can simply run the following command:

```shell
$ cdk destroy --all
```
