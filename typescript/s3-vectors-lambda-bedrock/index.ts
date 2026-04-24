import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export class S3VectorsLambdaBedrockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vectorBucketName = new cdk.CfnParameter(this, "VectorBucketName", {
      type: "String",
      default: "rag-knowledge-base-vectors",
      description: "Name for the S3 vector bucket",
    });

    const indexName = "knowledge-base";

    const s3VectorsPolicy = new iam.PolicyStatement({
      actions: [
        "s3vectors:CreateVectorBucket", "s3vectors:DeleteVectorBucket",
        "s3vectors:CreateVectorIndex", "s3vectors:DeleteVectorIndex",
        "s3vectors:PutVectors", "s3vectors:QueryVectors",
        "s3vectors:GetVectors", "s3vectors:DeleteVectors",
      ],
      resources: ["*"], // s3vectors does not support resource-level ARNs yet
    });

    const bedrockPolicy = new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
        "arn:aws:bedrock:*::foundation-model/*",
      ],
    });

    const sharedEnv = {
      VECTOR_BUCKET_NAME: vectorBucketName.valueAsString,
      INDEX_NAME: indexName,
      EMBED_MODEL_ID: "amazon.titan-embed-text-v2:0",
      GENERATION_MODEL_ID: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    };

    const ingestFn = new lambda.Function(this, "IngestFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "ingest.handler",
      code: lambda.Code.fromAsset("src"),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: sharedEnv,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    ingestFn.addToRolePolicy(s3VectorsPolicy);
    ingestFn.addToRolePolicy(bedrockPolicy);

    const queryFn = new lambda.Function(this, "QueryFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "query.handler",
      code: lambda.Code.fromAsset("src"),
      timeout: cdk.Duration.minutes(2),
      memorySize: 256,
      environment: sharedEnv,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    queryFn.addToRolePolicy(s3VectorsPolicy);
    queryFn.addToRolePolicy(bedrockPolicy);

    // Custom resource to create vector bucket and index on deploy
    const setupRole = new iam.Role(this, "SetupRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });
    setupRole.addToPolicy(s3VectorsPolicy);

    const createBucket = new cr.AwsCustomResource(this, "CreateVectorBucket", {
      onCreate: {
        service: "S3Vectors",
        action: "createVectorBucket",
        parameters: { vectorBucketName: vectorBucketName.valueAsString },
        physicalResourceId: cr.PhysicalResourceId.of("vector-bucket"),
      },
      onDelete: {
        service: "S3Vectors",
        action: "deleteVectorBucket",
        parameters: { vectorBucketName: vectorBucketName.valueAsString },
      },
      role: setupRole,
      policy: cr.AwsCustomResourcePolicy.fromStatements([s3VectorsPolicy]),
    });

    const createIndex = new cr.AwsCustomResource(this, "CreateVectorIndex", {
      onCreate: {
        service: "S3Vectors",
        action: "createVectorIndex",
        parameters: {
          vectorBucketName: vectorBucketName.valueAsString,
          indexName,
          dimension: 1024,
          distanceMetric: "cosine",
        },
        physicalResourceId: cr.PhysicalResourceId.of("vector-index"),
      },
      onDelete: {
        service: "S3Vectors",
        action: "deleteVectorIndex",
        parameters: { vectorBucketName: vectorBucketName.valueAsString, indexName },
      },
      role: setupRole,
      policy: cr.AwsCustomResourcePolicy.fromStatements([s3VectorsPolicy]),
    });
    createIndex.node.addDependency(createBucket);

    new cdk.CfnOutput(this, "IngestFunctionName", { value: ingestFn.functionName });
    new cdk.CfnOutput(this, "QueryFunctionName", { value: queryFn.functionName });
  }
}

const app = new cdk.App();
new S3VectorsLambdaBedrockStack(app, "S3VectorsLambdaBedrockStack");
