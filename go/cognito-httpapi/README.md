# Amazon Cognito to Amazon API Gateway HTTP APIs (JWT)

## Testing

The stack will output the **authorization domain** and **client id** required for using authorization via postman. Configure postman authorization as follows:

> **Client ID**: Get the Client ID from recently created Cognito Pool > App Integarion.


![Postman authentication](https://serverlessland.s3.amazonaws.com/assets/patterns/patterns-cognito-httpapi1.png)

1. The first time you get a new token, click **Sign Up** on the bottom of the hosted URL

![Postman authentication](https://serverlessland.s3.amazonaws.com/assets/patterns/patterns-cognito-httpapi2.png)
2. Retrieve code from your email
3. After verifying the code you can login and then be returned to postman with the proper access token.
