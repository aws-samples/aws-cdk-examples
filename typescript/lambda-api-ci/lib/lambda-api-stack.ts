import cdk = require('@aws-cdk/core');
import {
  AuthorizationType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from "@aws-cdk/aws-apigateway"
import { Function, Runtime, AssetCode, Code } from "@aws-cdk/aws-lambda"
import {Duration} from "@aws-cdk/core";

export class LambdaApiStack extends cdk.Stack {
  private restApi: RestApi
  private lambdaFunction: Function

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      timeout: Duration.seconds(10)
    })

    this.restApi.root
        // .resourceForPath("/v1/users")
        .addMethod(
            "GET",
            new LambdaIntegration(this.lambdaFunction, {})
        )
  }
}
