import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { BedrockKbAgentStack } from "../lib/bedrock-kb-agent-stack";

describe("BedrockKbAgentStack", () => {
  let app: cdk.App;
  let stack: BedrockKbAgentStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new BedrockKbAgentStack(app, "TestStack", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    template = Template.fromStack(stack);
  });

  test("Cognito User Pool is created with correct name", () => {
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "UserPoolTestStack",
    });
  });

  test("API Gateway HTTP API is created", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
    });
  });

  test("Lambda function is created with correct configuration", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "example.lambda_handler",
      Runtime: "python3.10",
      Timeout: 60,
    });
  });
  test("At least one IAM policy includes required Bedrock permissions", () => {
    const requiredActions = [
      "bedrock:RetrieveAndGenerate",
      "bedrock:Retrieve",
      "bedrock:InvokeModel",
      "bedrock:InvokeAgent",
    ];

    const allPolicies = template.findResources("AWS::IAM::Policy");

    const hasBedrockPermissions = Object.values(allPolicies).some((policy) => {
      const statements = policy.Properties.PolicyDocument.Statement;
      return statements.some(
        (statement: any) =>
          statement.Effect === "Allow" &&
          Array.isArray(statement.Action) &&
          requiredActions.every((action) => statement.Action.includes(action)),
      );
    });

    expect(hasBedrockPermissions).toBe(true);
  });

  test("S3 bucket for knowledge base is created", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    });
  });

  test("Bedrock Knowledge Base is created", () => {
    template.hasResourceProperties("AWS::Bedrock::KnowledgeBase", {
      KnowledgeBaseConfiguration: {
        Type: "VECTOR",
      },
    });
  });

  ///

  test("Bedrock Agent is created", () => {
    template.hasResourceProperties("AWS::Bedrock::Agent", {
      AgentName: "Agent-TestStack",
    });
  });

  test("API Gateway routes are created", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /api/v1/example",
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /api/v1/weather",
    });
  });

  test("Stack has the expected number of resources", () => {
    const resources = template.toJSON().Resources;
    expect(Object.keys(resources).length).toBeGreaterThan(0);
  });
});
