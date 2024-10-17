# Welcome to your CDK TypeScript project

This is a Tyepscript CDK project which enables implementing stepfunctions with external asl(Amazon States Language) file. This can be useful in usecases where it is desired to leverage local development flow of the stepfunction statemachines,e.g. AWS toolkit for VScode, and directly import the asl file into your project without rewriting it in CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
