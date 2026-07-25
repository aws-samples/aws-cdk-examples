#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { CIStack } from "../lib/ci-stack"

const app = new cdk.App()
new CIStack(app, "CDKExampleLambdaApiCIStack", {
    repositoryName: "lambda-api-ci",
})
