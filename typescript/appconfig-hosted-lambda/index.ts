import * as cdk from "aws-cdk-lib";
import * as appconfig from "aws-cdk-lib/aws-appconfig";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { Construct } from "constructs";

export class AppConfigHostedLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AppConfig application and environment
    const app = new appconfig.Application(this, "App", {
      applicationName: "MyFeatureFlags",
    });

    const env = new appconfig.Environment(this, "Env", {
      application: app,
      environmentName: "Production",
    });

    // Hosted configuration with feature flags
    new appconfig.HostedConfiguration(this, "Config", {
      application: app,
      deployTo: [env],
      type: appconfig.ConfigurationType.FEATURE_FLAGS,
      content: appconfig.ConfigurationContent.fromInlineJson(
        JSON.stringify({
          version: "1",
          flags: {
            dark_mode: { name: "dark_mode" },
            new_checkout: { name: "new_checkout" },
          },
          values: {
            dark_mode: { enabled: true },
            new_checkout: { enabled: false },
          },
        })
      ),
      deploymentStrategy: appconfig.DeploymentStrategy.fromDeploymentStrategyId(
        this, "Strategy",
        appconfig.DeploymentStrategyId.ALL_AT_ONCE
      ),
    });

    // Lambda function that reads feature flags via the AppConfig Lambda Extension
    const fn = new lambda.Function(this, "Fn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      timeout: cdk.Duration.seconds(10),
      environment: {
        APPCONFIG_APP: app.applicationId,
        APPCONFIG_ENV: env.environmentId,
        APPCONFIG_CONFIG: "MyFeatureFlags",
        // Prefetch config during extension init to reduce cold start latency
        AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: "/applications/MyFeatureFlags/environments/Production/configurations/MyFeatureFlags",
      },
    });

    // Grant the Lambda permission to read the configuration
    env.grantReadConfig(fn);

    // Outputs
    new cdk.CfnOutput(this, "FunctionName", { value: fn.functionName });
    new cdk.CfnOutput(this, "ApplicationId", { value: app.applicationId });
  }
}

const app = new cdk.App();
new AppConfigHostedLambdaStack(app, "AppConfigHostedLambdaStack");
