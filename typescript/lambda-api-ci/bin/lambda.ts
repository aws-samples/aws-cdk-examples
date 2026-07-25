#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { CDKExampleLambdaApiStack } from "../lib/lambda-api-stack"

export const lambdaApiStackName = "CDKExampleLambdaApiStack"
export const lambdaFunctionName = "CDKExampleWidgetStoreFunction"

const app = new cdk.App()
new CDKExampleLambdaApiStack(app, lambdaApiStackName, {
    functionName: lambdaFunctionName,
})
