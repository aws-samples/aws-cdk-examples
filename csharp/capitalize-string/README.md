This package is an example on how to use AWS CDK to deploy a Lambda function handler.
Both the CDK app and the Lambda handler are written in C# and built using the `dotnet` CLI.

# This project

## Structure

In this project, `Program.cs` is the main entry point of the CDK app and the CDK construct
for the lambda function is configured in `CapitalizeStringStack.cs`.

The lambda function is another csharp project residing within the `CapitalizeStringHandler`
folder.

## Build & Deploy

Build -

```shell
cd CapitalizeStringHandler/src/CapitalizeStringHandler
dotnet build
dotnet tool install -g Amazon.Lambda.Tools # if not already
dotnet lambda package
cd ../../../
dotnet build src
```

Deploy & Test -

```shell
cdk deploy
dotnet lambda invoke-function <function-name> --payload "hello world"
```

# How to do this yourself?

## Pre-requisites

If you're unfamiliar with AWS Lambda functions in C#, read this first -
https://docs.aws.amazon.com/lambda/latest/dg/dotnet-programming-model.html

## Steps

1. Create the CDK app project folder -

    ```shell
    mkdir <cdk-project-folder> && cd <cdk-project-folder>
    cdk init -l=csharp
    ```

2. Modify the `.csproj` file to include the latest versions of the following NuGet packages -

    ```
    Amazon.CDK
    Amazon.CDK.AWS.Lambda
    Amazon.Jsii.Analyzers
    ```

3. Use the `dotnet` CLI to generate a c# project to manage the Lambda function handler -

    ```shell
    dotnet new -i Amazon.Lambda.Templates
    dotnet new lambda.EmptyFunction --name <handler-project-name>
    ```

    This should create a new folder with the same name as the project.
    For more details, see https://docs.aws.amazon.com/lambda/latest/dg/lambda-dotnet-coreclr-deployment-package.html

4. Look for the `.cs` file within the `src/` folder of the now created project folder.
    This is the entry point for your lambda function code. Modify the code as you see fit.

5. Now build and package the lambda function handler package -

    ```shell
    cd <handler-project-name>/src/<handler-project-name>
    dotnet build
    dotnet tool install -g Amazon.Lambda.Tools # if not already
    dotnet lambda package
    ```

    This should have created a folder `bin/Release/netcoreapp3.1/publish/` which is the package
    that needs to be deployed to AWS Lambda as the function code.

6. In the CDK project, create an instance of `Function` class from the Lambda module.

    Specify the `Runtime` to be one of the `DOTNET_CORE` runtimes available and set the correct
    handler value based on the name of your lambda function project, namespaces and class name.

    Specify an `Asset` against the `Code` property, pointing to the location of the Lambda project
    on local disk. This must be the path to the `publish/` folder generated in the previous step,
    i.e., the relative path of the `publish/` folder from the CDK project root.

    See `LambdaCdkCsharpStack.cs` file in this project to see how this is done.
    See the lambda guide for more details -
    https://docs.aws.amazon.com/lambda/latest/dg/dotnet-programming-model-handler-types.html#dotnet-programming-model-handler-signatures

7. Build the CDK application and deploy -

    ```shell
    cd <cdk-project-folder>
    dotnet build src/
    cdk deploy
    ```

8. Invoke the lambda function using the `dotnet` CLI. The payload specified below works for the
   Lambda function configured in this project. Modify it per your lambda function.

    ```shell
    dotnet lambda invoke-function <function-name> --payload "hello world"
    ```
