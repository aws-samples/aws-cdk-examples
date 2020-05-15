# Welcome to your Bilingual CDK TypeScript project!

This is a HelloWorld project for TypeScript development with CDK, and AWS Lambda in Golang.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Project structure

* `src` folder has source code for AWS Lambda written in Golang
* `cdk` folder has TypeScript CDK code creating CloudFormation Stack with a single lambda

## Useful commands

 * `npm run build`   compile TypeScript to js
 * `npm run watch`   watch for changes and compile
 * `make all`        build AWS Lambda source code (Golang)
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
