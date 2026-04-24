import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class ApigwStreamingLambdaBedrockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const modelId = new cdk.CfnParameter(this, "BedrockModelId", {
      type: "String",
      default: "us.anthropic.claude-sonnet-4-20250514-v1:0",
      description: "Bedrock inference profile model ID",
    });

    const fn = new lambda.Function(this, "StreamingBedrockFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("src"),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: { MODEL_ID: modelId.valueAsString },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModelWithResponseStream"],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${modelId.valueAsString}`,
          "arn:aws:bedrock:*::foundation-model/*",
        ],
      })
    );

    const api = new apigateway.RestApi(this, "StreamingApi", {
      restApiName: "Bedrock Streaming API",
      description: "REST API with response streaming to Bedrock",
      deployOptions: { stageName: "prod" },
    });

    const chatResource = api.root.addResource("chat");
    const method = chatResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(fn, { timeout: cdk.Duration.minutes(5) })
    );

    // Override to use streaming invocation path
    const cfnMethod = method.node.defaultChild as apigateway.CfnMethod;
    cfnMethod.addPropertyOverride(
      "Integration.Uri",
      `arn:aws:apigateway:${this.region}:lambda:path/2021-11-15/functions/${fn.functionArn}/response-streaming-invocations`
    );
    cfnMethod.addPropertyOverride("Integration.ResponseTransferMode", "STREAM");
    cfnMethod.addPropertyOverride("Integration.TimeoutInMillis", 300000);

    new cdk.CfnOutput(this, "ApiEndpoint", { value: api.urlForPath("/chat") });
    new cdk.CfnOutput(this, "FunctionName", { value: fn.functionName });
  }
}

const app = new cdk.App();
new ApigwStreamingLambdaBedrockStack(app, "ApigwStreamingLambdaBedrockStack");
