# Amazon SQS to AWS Lambda

The CDK template deploys a Lambda function, an SQS queue and the IAM permissions required to run the application. SQS invokes the Lambda function when new messages are available.


### Testing

1. Send the SQS message:
```bash
aws sqs send-message --queue-url ENTER_YOUR_SQS_QUEUE_URL --message-body "Test message"
```
2. Retrieve the logs from the Lambda function:
```bash
aws logs describe-log-streams --log-group-name '/aws/lambda/<LAMBDA_FUNCTION_NAME>' | jq '.logStreams[0].logStreamName'
aws logs get-log-events --log-group-name '/aws/lambda/<LAMBDA_FUNCTION_NAME>' --log-stream-name 'LOGSTREAM_NAME_FROM_ABOVE_OUTPUT'
```
