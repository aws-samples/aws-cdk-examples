# REST API Gateway with Lambda Authorizer Pattern

## How to Run CDK TypeScript project

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Useful commands

* `yarn install`    install dependencies of project
* `yarn test`       perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## About Pattern

Pattern is example for integration of Lambda-based REST API Gateway with a tokenizing Lambda authentication mechanism represents a pivotal step towards establishing a secure scalable, and efficient cloud-native architecture.

### What is Lambda Authorizer

A Lambda authorizer (formerly known as a custom authorizer) is an API Gateway feature that uses a Lambda function to control access to your API.

A Lambda authorizer is useful if you want to implement a custom authorization scheme that uses a bearer token authentication strategy such as OAuth or SAML, or that uses request parameters to determine the caller's identity.

## Lambda authorizer Auth workflow

![Auth Workflow](https://docs.aws.amazon.com/images/apigateway/latest/developerguide/images/custom-auth-workflow.png)

### References

[Use API Gateway Lambda authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
