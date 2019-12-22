# This example demonstrates how to pass objects between stacks

One of my favorite parts about CDK is that I don't have to be concerned with how
the underlying cloudformation expects resources. Ideally the level of
abstraction that I want to deal with is that I have a Lambda Function in one
stack and I want to just hand the whole function to other stacks that need it.
I do not have to worry about whether API Gateway expects a Function Name or a
Function ARN or some other identifier for a Function, I can simply pass the
Function Object to the stacks that need it and let CDK handle the details.

In this example we create an AWS Lambda Function in one stack and then make it
available as a property of that stack for other stacks to consume.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
