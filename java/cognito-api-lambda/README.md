# APIGateway backed by Lambda and protected by a Cognito User Pool.


<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This an example of an APIGateway that is protected with a Cognito User Pool, pointing to a Hello World Lambda.

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
After the deployment, the URL of the Rest API created will be available in the outputs of the CloudFormation stack and can be used to invoke the lambda function.
At this point, if an HTTP GET request is attempted on the Rest API without including and `Authorization` header, a `401 - Unauthorized` response will be returned.
In order for the authorization to succeed when the lambda function is invoked through the API Gateway, each request must include an `Authorization` HTTP header containing an access token obtained for the specific user from the user pool.

## The Component Structure

The main resources of the component are:

- A Lambda Function that returns the string "Hello world!"
- A Rest API with a GET method that points to the Lambda Function
- A Cognito User Pool
- An Authorizer for the Rest API with the User Pool attached.

## Useful commands

* `mvn package`     compile and run tests
* `cdk ls`          list all stacks in the app
* `cdk synth`       emits the synthesized CloudFormation template
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk docs`        open CDK documentation
