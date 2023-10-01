# APIGateway with CORS, Lambdas, and CRUD on DynamoDB
<!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This example deploys API Gateway, integrated with five Lambdas which perform CRUD operations against a DynamoDB table.

## Prerequisites
* Docker
* AWS CDK CLI

## Build
To build this app, you need to be in this example's root folder. Then run the following:


```bash
npm install -g aws-cdk
cdk synth
```

## Deploy
To deploy this app, you need to be in this example's root folder. Then run the following:


```bash
cdk bootstrap
cdk deploy
```

This will deploy / redeploy your Stack to your AWS Account. After the deployment you will see the API's URL, which represents the url you can then use.
