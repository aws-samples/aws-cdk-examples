
# API Gateway + SQS + Lambda

Creates an API Gateway API with a POST Method, a SQS queue, and a Lambda function. Requests to the API are enqueued into the SQS queue, which triggers the Lambda function.

![Architecture](architecture.png)

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project. The initialization process also creates a virtualenv within this
project, stored under the `.env` directory. To create the virtualenv it assumes that there is a `python3` (or `python`
for Windows) executable in your path with access to the `venv` package. If for any reason the automatic creation of the
virtualenv fails, you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .env
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .env/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .env\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

## Testing the app

Upon successful deployment, you should see an API Gateway REST API in your account. It can be tested from the console or the CLI:

```
$ aws apigateway test-invoke-method --rest-api-id <API ID> --resource-id <RESOURCE ID> --http-method POST --body {"key":"value"}
```

This request should complete with a 200 OK. The Lambda function should print the API Gateway request body in its CloudWatch logs. (https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)

```
2020-05-27T11:50:44.755-05:00           Received Message Body from API GW: {key:value}
```
	
This message will also be visible in the SQS Queue metrics in CloudWatch. (https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-access-metrics.html)
