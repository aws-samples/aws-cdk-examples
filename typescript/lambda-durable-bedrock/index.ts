import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class LambdaDurableBedrockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const modelId = new cdk.CfnParameter(this, "BedrockModelId", {
      type: "String",
      default: "us.anthropic.claude-sonnet-4-20250514-v1:0",
      description: "Bedrock inference profile model ID",
    });

    const fn = new lambda.Function(this, "DurableBedrockFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("src"),
      timeout: cdk.Duration.minutes(15),
      memorySize: 256,
      environment: { MODEL_ID: modelId.valueAsString },
    });

    // Enable durable execution via escape hatch (no L2 yet)
    const cfnFn = fn.node.defaultChild as lambda.CfnFunction;
    cfnFn.addOverride("Properties.Runtime", "nodejs24.x");
    cfnFn.addOverride("Properties.DurableConfig", {
      ExecutionTimeout: 900,
      RetentionPeriodInDays: 14,
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${modelId.valueAsString}`,
          "arn:aws:bedrock:*::foundation-model/*",
        ],
      })
    );

    fn.role!.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicDurableExecutionRolePolicy"
      )
    );

    const cfnVersion = new lambda.CfnVersion(this, "DurableVersion", {
      functionName: fn.functionName,
      description: "Durable execution version",
    });

    new cdk.CfnOutput(this, "FunctionName", { value: fn.functionName });
    new cdk.CfnOutput(this, "VersionNumber", { value: cfnVersion.attrVersion });
  }
}

const app = new cdk.App();
new LambdaDurableBedrockStack(app, "LambdaDurableBedrockStack");
