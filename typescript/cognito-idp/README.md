# A web site and REST API with Cognito authentication using the Facebook identity pool provider

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

Put the following into a .env file in the root folder for this example, replacing each placeholder value with your specific environment values.

```
AWS_REGION=us-east-1
AWS_ACCOUNT=123456789123
WEB_DOMAIN=myapp.example.com
API_DOMAIN=myapi.example.com
WEB_CERTIFICATE_ARN=
API_CERTIFICATE_ARN=
FACEBOOK_APP_ID=
FACBOOK_VERSION=v7.0
FACEBOOK_SECRET_ARN=
COGNITO_REDIRECT_URI=
COGNITO_DOMAIN_PREFIX=
COGNITO_REGION=
```

Add these environment variables after deployment to enable api integration testing:

```
COGNITO_APP_CLIENT_ID=
COGNITO_POOL_ID=
USER_TABLE=
JWT=
```

## Build and Deploy

```
cd functions
npm install
cd ..
npm install
npm run build
npm run unit-test
npm run deploy
npm run database-test
npm run handler-test
npm run api-test
```
