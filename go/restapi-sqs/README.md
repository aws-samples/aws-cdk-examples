# Amazon Api Gateway Rest Api to Amazon SQS

## Testing

Obtain Resource ID
```
$ aws apigateway get-resources --rest-api-id <Rest API ID>
```

Test the endpoint
```
$ aws apigateway test-invoke-method --rest-api-id <Rest API ID> --resource-id <RESOURCE ID> --http-method POST --body {"key":"value"}
```