
# CDK Sample App

Welcome to your CDK .NET project!

You should explore the contents of this template. It demonstrates a CDK app with two instances of
a stack (`ApiCorsLambdaCrudDynamodbStack`) which also uses a user-defined construct (`ApiCorsLambdaCrudDynamodbConstruct`).

The `cdk.json` file tells the CDK Toolkit how to execute your app. It uses the `dotnet` CLI to do this.

# Useful commands

* `dotnet build src` compile this app
* `cdk ls`           list all stacks in the app
* `cdk synth ApiCorsLambdaCrudDynamodbStack-1`  emits the synthesized CloudFormation template for the first stack
* `cdk deploy ApiCorsLambdaCrudDynamodbStack-1` deploy this stack to your default AWS account/region
* `cdk diff ApiCorsLambdaCrudDynamodbStack-1`   compare deployed stack with current state
* `cdk docs`         open CDK documentation

Enjoy!
