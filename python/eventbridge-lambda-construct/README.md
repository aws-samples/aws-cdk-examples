<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

# Overview

This is a construct and attached example which create a dummy docker image Lambda function and associate it with an [Amazon EventBridge](https://aws.amazon.com/eventbridge/) bus rule based on the service name in an existing EventBridge bus passed as a parameter of the construct. Additionally, the construct create a unique Dead Letter Queue using SQS.

This construct can be used as a fundamental building block to build, for example, a serverless microservices choregraphy. This is possible because by using Amazon EventBridge, we are able to leverage [Lambda asynchronous invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html). Outside of direct the benefits of asynchronous invocation, this allows to chains services using the `on_success` and `on_failure` destination [documentation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-async-destinations) with a provided Dead Letter Queue SQS in the construct for the `on_failure`. This pattern is currently the only way to fully respect the Infrastructure as Code paradigm. Indeed, in this configuration, and as per this construct, the service implementation does not need to be stateful regarding the input and output endpoints. Those outputs are defined directly in the CDK script while the microservices business logic can be written, run, tested, and deployed independently using containerization.

In this complete example, we are creating two services in the way described above, one which write back to its original source bus, and another which write a different bus. Note that the construct uses the `id` of the services to find the right path to the Docker file to build.

# Build/Deploy

## Building the Docker image of the service independently

The following guidance is for any of the Lambda service.
If you run `runlocally.sh` you will build a Lambda container image and run it locally on port `9000`.
You can then use `calllocally.sh` to call that Lambda function. This is a trivial example to show how building the microservices logic is now totally isolated from the infrastructure.

Lambda should receive and print `Hello AWS! event = {'message': 'Hello World'}`
The Lambda should respond `{"statusCode": 200, "reponse": "Hello Lambda"}` to your call.

## Deploying the construct using CDK

To run the stack you will need to add a `secrets.json` file in the root of the `eventbridge-lambda-construct`. This file should contains the following information:

    {
        "account": "YOUR-ACCOUNT-NUMBER",
        "region": "YOUR-REGION"
    }

Once done, to build the stack simply run `cdk deploy`

## Test the services

Once the Stack has been deployed, the rule used to push events to the correct Lambda function is a pattern matching the `source` field to the service `id`. If you send some events with `source` as `backtosource` using the Send Events tool in the AWS Console, and monitor it using a rule to send all events to CloudWatch, you will see that the following events are indeed being returned by your service:

    {
        "version": "0",
        "id": "4f37bfa8-44dd-7741-e756-c6f51323b05d",
        "detail-type": "Lambda Function Invocation Result - Success",
        "source": "lambda",
        "account": "YOUR-ACCOUNT-NUMBER",
        "time": "2022-12-21T15:37:14Z",
        "region": "YOUR-REGION",
        "resources": [
            "arn:aws:events:YOUR-REGION:YOUR-ACCOUNT-NUMBER:event-bus/source_bus",
            "arn:aws:lambda:YOUR-REGION:YOUR-ACCOUNT-NUMBER:function:EventBridgeServicesStack-backtosourcelambda5A5324E-TGjYMQXRlQEU:service_at_1671634563"
        ],
        "detail": {
            "version": "1.0",
            "timestamp": "2022-12-21T15:37:14.621Z",
            "requestContext": {
                "requestId": "794a02f1-0504-4c56-9dd0-bb6c235c24cf",
                "functionArn": "arn:aws:lambda:YOUR-REGION:YOUR-ACCOUNT-NUMBER:function:EventBridgeServicesStack-backtosourcelambda5A5324E-TGjYMQXRlQEU:service_at_1671634563",
                "condition": "Success",
                "approximateInvokeCount": 1
            },
            "requestPayload": {
                "version": "0",
                "id": "60e07636-af17-4ca4-4d75-7df75930ae25",
                "detail-type": "Details",
                "source": "backtosource",
                "account": "YOUR-ACCOUNT-NUMBER",
                "time": "2022-12-21T15:32:01Z",
                "region": "YOUR-REGION",
                "resources": [],
                "detail": {
                    "message": "Hello World"
                }
            },
            "responseContext": {
                "statusCode": 200,
                "executedVersion": "1"
            },
            "responsePayload": {
                "statusCode": 200,
                "reponse": "Hello Lambda"
            }
        }
    }

This also works for the `toanother` service and the `output_bus`.

# Next Steps

Using this construct, you can now add logic in you services to route the response payloads to another service using the `source` field in the messages, and hence build service choregraphy without having to manage endpoints and scalability in the service logic.

# Cleanup

To remove the Stack, simply run `cdk destroy`.
