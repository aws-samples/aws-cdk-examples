/**
 * Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import * as cdk from "aws-cdk-lib";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as genai from "@cdklabs/generative-ai-cdk-constructs";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { Construct } from "constructs";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { S3Construct } from "./constructs/s3-construct";
import { NagSuppressions } from "cdk-nag";

export class BedrockKbAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const cognito = new CognitoWebNativeConstruct(this, "Cognito", props);

    const webAppBuildPath = "./web-app/dist";

    const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
      userPoolId: cognito.userPool.userPoolId,
      appClientId: cognito.webClientId,
      identityPoolId: cognito.identityPoolId,
      webSiteBuildPath: webAppBuildPath,
      withApi: true,
      // If you have created a bucket to be used as Storage for amplify
      // use the following prop
      // storageBucketName: myBucket.bucketName
    });

    const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
      cloudFrontDistribution: website.cloudFrontDistribution,
      userPool: cognito.userPool,
      userPoolClient: cognito.webClientUserPool,
    });

    const exampleFn = new lambdaPython.PythonFunction(this, "ExampleLambdaFn", {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
      handler: "lambda_handler",
      index: "example.py",
      entry: "./api/example-powertools",
      timeout: cdk.Duration.seconds(60),
      environment: {},
      initialPolicy: [
        new cdk.aws_iam.PolicyStatement({
          effect: cdk.aws_iam.Effect.ALLOW,
          actions: ["bedrock:RetrieveAndGenerate", "bedrock:Retrieve", "bedrock:InvokeModel", "bedrock:InvokeAgent"],
          resources: ["*"],
        }),
      ],

    });

    new ApiGatewayV2LambdaConstruct(this, "ExampleKBGateway", {
      lambdaFn: exampleFn,
      routePath: "/api/v1/example",
      methods: [
        cdk.aws_apigatewayv2.HttpMethod.POST,
      ],
      api: api.apiGatewayV2,
    });

    new ApiGatewayV2LambdaConstruct(this, "ExampleAgentGateway", {
      lambdaFn: exampleFn,
      routePath: "/api/v1/weather",
      methods: [
        cdk.aws_apigatewayv2.HttpMethod.POST,
      ],
      api: api.apiGatewayV2,
    });
    const knowledgeBaseBucket = new S3Construct(
      this,
      `KnowledgeBase-${this.stackName}`,
      {},
    );
    const knowledgeBase = this.buildKnowledgeBase({
      bucket: knowledgeBaseBucket.dataBucket,
      knowledgeBaseFolder: "knowledge-base/",
    });

    exampleFn.addEnvironment("KNOWLEDGE_BASE_ID", knowledgeBase.knowledgeBaseId);

    const agent = this.buildAgent([knowledgeBase]);

    if (!agent.aliasName) {
      throw Error("The agent must have a valid alias");
    }
    if (!agent.aliasId) {
      throw Error("The agent must have a valid alias");
    }

    exampleFn.addEnvironment("AGENT_ID", agent.agentId);
    exampleFn.addEnvironment("AGENT_ALIAS_ID", agent.aliasId);
  }

  private buildKnowledgeBase({
    bucket,
    knowledgeBaseFolder,
  }: {
    bucket: cdk.aws_s3.Bucket;
    knowledgeBaseFolder: string;
  }): genai.bedrock.KnowledgeBase {
    const knowledgeBase = new genai.bedrock.KnowledgeBase(
      this,
      "BedrockKnowledgeBase",
      {
        embeddingsModel:
          genai.bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
        instruction:
          "Use this knowledge base to answer questions about Amazon Web Services products.",
      },
    );

    new genai.bedrock.S3DataSource(this, "DataSource", {
      bucket: bucket,
      knowledgeBase: knowledgeBase,
      dataSourceName: `DataSource-${this.stackName}`,
      inclusionPrefixes: [knowledgeBaseFolder],
      chunkingStrategy: genai.bedrock.ChunkingStrategy.FIXED_SIZE,
    });

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `/${this.node.id}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource`,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Resource automatically created by the Bedrock constructs and cannot be modified",
          appliesTo: ["Resource::*"],
        },
      ],
      true,
    );

    return knowledgeBase;
  }

  private buildAgent(knowledgeBases: genai.bedrock.KnowledgeBase[]): genai.bedrock.Agent {
    const fn = new lambdaPython.PythonFunction(this, "agent", {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
      handler: "lambda_handler",
      index: "example.py",
      entry: "./api/example-agent",
      description: `Agent lambda for [${this.stackName}]`,
      timeout: cdk.Duration.minutes(4),
      memorySize: 10240,

      initialPolicy: [
        new cdk.aws_iam.PolicyStatement({
          effect: cdk.aws_iam.Effect.ALLOW,
          actions: ["bedrock:InvokeModel"],
          resources: ["*"],
        }),
      ],
      reservedConcurrentExecutions: 1,
    });

    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];
    const aliasName = `agent-${timestamp}`;

    const agent = new genai.bedrock.Agent(this, "Agent", {
      name: `Agent-${this.stackName}`,
      aliasName: aliasName,
      foundationModel:
        genai.bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_V2_1,
      instruction:
        "You are a helpful and friendly agent that answers weather related questions.",
      knowledgeBases: knowledgeBases,
    });

    const actionGroup = new genai.bedrock.AgentActionGroup(
      this,
      "ActionGroup",
      {
        actionGroupName: "weatherAG",
        description:
          "Use these functions to get information about weather in a given location.",
        actionGroupExecutor: {
          lambda: fn,
        },
        actionGroupState: "ENABLED",
        apiSchema: genai.bedrock.ApiSchema.fromAsset("./api/example-agent/openapi.json",),
      },
    );

    agent.addActionGroup(actionGroup);
    new cdk.CfnOutput(this, "AgentId", { value: agent.agentId });
    if (agent.aliasId) {
      new cdk.CfnOutput(this, "AgentAliasId", { value: agent.aliasId });
    }
    if (agent.aliasName) {
      new cdk.CfnOutput(this, "AgentAliasName", { value: agent.aliasName });
    }

    return agent;
  }
}
