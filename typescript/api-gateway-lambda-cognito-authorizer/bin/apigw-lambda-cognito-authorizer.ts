#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApigwLambdaCognitoAuthorizerStack } from "../lib/apigw-lambda-cognito-authorizer-stack";

const app = new cdk.App();
new ApigwLambdaCognitoAuthorizerStack(
  app,
  "ApigwLambdaCognitoAuthorizerStack",
  {
    cognitoUserPoolId: "XXXXXXXXXXXXXX",
  }
);
