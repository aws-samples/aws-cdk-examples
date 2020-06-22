# A web site and REST API with Cognito authentication (user pools) using the Facebook identity provider

The example will show you how to create the following:

- A single-page app hosted by S3 and CloudFront
- A REST API that uses Cognito for authentication
- Integration of Facebook as an identity provider

It also demonstrates a somewhat opinionated way to organize your lambda functions and test them.

## Prerequisites

There is a bit of setup required before you can deploy this stack.

- A domain that you control with Route53 in your development account
    - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/getting-started.html
    - Be careful about Cognito reserved domains.
        - You can't have 'aws' or 'cognito' anywhere in the domain name
- A certicate that covers the web site and the API, created with ACM
    - For example, you own "example.com"
    - You have a certificate for "myapp.example.com" and "myapi.example.com"
    - https://docs.aws.amazon.com/acm/latest/userguide/gs.html
- A Facebook Developer account
    - Create an app and put the app id into your .env
    - Store the app secret in AWS Secrets Manager as facebook_app_secret
    - https://developers.facebook.com/docs/facebook-login/
    - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
    - (Don't follow the separate guide for integrating Facebook with Identity Pools)

## Environment Variables

Create file called config/env-local.json using the following json as a template. Replace those values with your own.
(Some of the values, starting with cognitoPoolId, are only used for integration testing and can be left blank until after your first deployment)

```json
{ 
    "env": {
        "account": "012345678901",
        "region": "us-east-1"
    }, 
    "webDomainName": "www.example.com",
    "webCertificateArn": "arn:aws:acm:us-east-1:0123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "facebookSecretArn": "arn:aws:secretsmanager:us-east-1:012345678901:secret:facebook_app_secret-Abcdef",
    "facebookAppId": "111111111111111",
    "facebookApiVersion": "v7.0",
    "apiDomainName": "api.example.com",
    "apiCertificateArn": "arn:aws:acm:us-east-1:0123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "cognitoRedirectUri": "https://www.example.com", 


    "cognitoPoolId": "us-east-1_0123456789", 
    "cognitoDomainPrefix": "www-example-com", 
    "cognitoAppClientId": "A1A1A1A1A1A1A1A1A1A1A1A1A1", 
    "cognitoRegion:": "us-east-1", 
    "userTable": "CognitoIdpStack-UsersTableAAAAAAAA-000000000000", 
    "jwt": ""
}
```

## Build and Deploy

```
# Install lambda dependencies
cd lambda
npm install

cd ..
npm install
npm run build
npm run unit-test
npm run deploy

# Get values from the deployment output to complete env-local.json.
# Then you can run integration tests.
node build/test/create-admin-user.js
# After that, manually add is_super_admin=true to the record in DynamoDB
npm run database-test
npm run handler-test
npm run api-test
```
