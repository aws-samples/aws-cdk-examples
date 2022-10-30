# Welcome to your CDK C# project!

This is a blank project for CDK development with C#.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

It uses the [.NET Core CLI](https://docs.microsoft.com/dotnet/articles/core/) to compile and execute your project.

## Useful commands

- `dotnet build src` compile this app
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

at aws-cdk-examples\csharp\apigateway-cognito-lambda-dynamodb -
dotnet publish Lambda\BackendFunction\BackendFunction.csproj -c Release -o dist/BackendFunction
dotnet publish Lambda\AuthFunction\AuthFunction.csproj -c Release -o dist/AuthFunction

https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
API GW Access Policy-
https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies.html
Policy statement resource url
https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html#api-gateway-iam-policy-resource-format-for-executing-api
https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-input.html
https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html

aws dynamodb batch-write-item --request-items file://DynamoDBData.json
