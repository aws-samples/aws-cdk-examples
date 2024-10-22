# API Gateway Asynchronous Lambda Invocation

Sample architecture to process events asynchronously using API Gateway and Lambda and store result in DynamoDB.

## Architecture
![architecture](./images/architecture.png)

## Test:
- `POST` curl command:
```shell
curl -X POST https://<API-ID>.execute-api.<REGION>.amazonaws.com/<stage>/job \
    -H "X-Amz-Invocation-Type: Event" \
    -H "Content-Type: application/json" \
    -d '{}'
```

- `GET` curl command to get job details:
```shell
# jobId refers the output of the POST curl command.
curl https://<API-ID>.execute-api.<REGION>.amazonaws.com/<stage>/job/<jobId>
```


```
In Lambda non-proxy (custom) integration, the backend Lambda function is invoked synchronously by default.  
This is the desired behavior for most REST API operations.  
Some applications, however, require work to be performed asynchronously (as a batch operation or a long-latency operation), typically by a separate backend component.  
In this case, the backend Lambda function is invoked asynchronously, and the front-end REST API method doesn't return the result.
```

### Reference:
[1] Set up asynchronous invocation of the backend Lambda function  
https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-integration-async.html
