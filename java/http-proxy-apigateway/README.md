# HTTP Proxy APIGateway

<!--BEGIN STABILITY BANNER-->

---
![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)
> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---

<!--END STABILITY BANNER-->

This example creates an API Gateway with proxy resources for 2 HTTP backends.
This is useful for scenarios when incoming requests must be routed to one or more backend API hosts.
An HTTP proxy integration enables direct interactions between clients and backends without any intervention from the API Gateway after the API method is set up.

> For more information on using HTTP proxy integrations with the APIGateway check out this [AWS tutorial](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-http.html).

> For demonstration purposes this CDK example deploys a solution that routes to a couple of test HTTP APIs.
> The 2 test HTTP APIs are implemented using lambdas exposed through function URLs.
> This example can be modified though, if you prefer to use your own HTTP backend APIs.
> To do that you can modify the `createHTTPTestAPIs` method in the [`HttpProxyApiGatewayStack`](src/main/java/com/myorg/HttpProxyApiGatewayStack.java) class to return a list of `ProxyResourceParameters` corresponding to your own resources.

## Build

To build this example, you need to be in this example's root directory. Then run the following:

```bash
  npm install -g aws-cdk
  npm install
  cdk synth
```

This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.

## Deploy

Run `cdk deploy`.
This will deploy / redeploy the Stack to AWS.
After the CDK deployment is successful, 2 URL examples will be available in the terminal console:

- One for the `HttpProxyApiGatewayStack.HelloFunctionResourceExample` output
- One for the `HttpProxyApiGatewayStack.ByeFunctionResourceExample` output

At this point, you can copy each of the 2 URLs and paste them in the address bar of a browser to invoke the 2 APIs.
Also note that both URLs have the same host (the DNS of the new API Gateway created).

## Useful commands

* `mvn package`     compile and run tests
* `cdk ls`          list all stacks in the app
* `cdk synth`       emits the synthesized CloudFormation template
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk docs`        open CDK documentation
