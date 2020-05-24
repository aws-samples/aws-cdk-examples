# A web site and REST API with Cognito authentication using the Facebook identity pool provider

The example will show you how to create the following:

- A single-page app hosted by S3 and CloudFront
- A REST API that uses Cognito for authentication
- Integration of Facebook as an identity provider

It also demonstrates a somewhat opinionated way to organize your lambda functions and test them.

## Prerequisites

- A domain that you control with Route53 in your development account
- A certicate that covers the web site and the API, created with ACM
    - For example, you own "example.com"
    - You have a certificate for "myapp.example.com" and "myapi.example.com"

## Environment Variables

Put the following into a .env file in the root folder for this example, replacing each placeholder value with your specific environment values.

AWS_REGION=us-east-1
AWS_ACCOUNT=123456789123
WEB_DOMAIN=myapp.example.com
API_DOMAIN=myapi.example.com
CERTIFICATE_ARN=
FACEBOOK_APP_ID=

After your first deployment, in order to facilitate integration testing, add the following values to the .env file:

COGNITO_REDIRECT_URI=
COGNITO_POOL_ID=
COGNITO_DOMAIN_PREFIX=
COGNITO_APP_CLIENT_ID=
COGNITO_REGION=

## Build and Deploy

```
cd functions
npm install
cd ..
npm install
npm run build
npm run unit-test
npm run deploy
npm run handler-test
npm run api-test
```
