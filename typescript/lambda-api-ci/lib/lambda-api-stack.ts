import cdk = require('@aws-cdk/core');
import {
  AuthorizationType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from "@aws-cdk/aws-apigateway"
import { Function, Runtime, AssetCode, Code } from "@aws-cdk/aws-lambda"
import {Duration} from "@aws-cdk/core"
import s3 = require("@aws-cdk/aws-s3");

export class LambdaApiStack extends cdk.Stack {
  private restApi: RestApi
  private lambdaFunction: Function
  private bucket: s3.Bucket

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "WidgetStore");

    this.restApi = new RestApi(this, "RestApi", {
      deployOptions: {
        stageName: "beta",
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true
      }
    })

    this.lambdaFunction = new Function(this, "LambdaFunction", {
      handler: "handler.handler",
      runtime: Runtime.NODEJS_10_X,
      code: new AssetCode(`./lambda`),
      memorySize: 512,
      timeout: Duration.seconds(10),
      environment: {
        BUCKET: this.bucket.bucketName
      }
    })

    this.restApi.root
        .addMethod(
            "GET",
            new LambdaIntegration(this.lambdaFunction, {})
        )
  }
}
