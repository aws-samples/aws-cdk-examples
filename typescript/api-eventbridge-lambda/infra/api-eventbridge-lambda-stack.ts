import * as cdk from "@aws-cdk/core";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";
import { Rule } from "@aws-cdk/aws-events";
import {
  KinesisFirehoseStream,
  LambdaFunction,
} from "@aws-cdk/aws-events-targets";
import { Bucket } from "@aws-cdk/aws-s3";
import { CfnDeliveryStream } from "@aws-cdk/aws-kinesisfirehose";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";

export class ApiEventbridgeLambdaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Producer Lambda
    const eventProducerLambda = new Function(this, "Event-Producer-Lambda", {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("dist"),
      handler: "eventProducerLambda.handler",
    });

    // Event Policy
    const eventPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ["*"],
      actions: ["events:PutEvents"],
    });
    eventProducerLambda.addToRolePolicy(eventPolicy);

    // Approved Consumer1
    const eventConsumer1Lambda = new Function(this, "Event-Consumer-1-Lambda", {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("dist"),
      handler: "eventConsumerLambda.handler",
    });

    const eventConsumer1Rule = new Rule(this, "Event-Consumer-1-Lambda-Rule", {
      description: "Approved Transactions",
      eventPattern: { source: ["com.mycompany.myapp"] },
    });

    eventConsumer1Rule.addTarget(new LambdaFunction(eventConsumer1Lambda));

    // Approved Consumer2
    const eventConsumer2Lambda = new Function(this, "Event-Consumer-2-Lambda", {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("dist"),
      handler: "eventConsumerLambda.handler",
    });

    const eventConsumer2Rule = new Rule(this, "Event-Consumer-2-LambdaRule", {
      description: "Approved Transactions",
      eventPattern: { source: ["com.mycompany.myapp"] },
    });

    eventConsumer2Rule.addTarget(new LambdaFunction(eventConsumer2Lambda));

    // Approved Consumer3
    // Create S3 bucket for KinesisFirehose destination
    const ingestBucket = new Bucket(this, "test-ingest-bucket");

    // Create a Role for KinesisFirehose
    const firehoseRole = new Role(this, "MyFireHostRole", {
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
    });

    // Create and attach policy that gives permissions to write in to the S3 bucket.
    const policy = new Policy(this, "S3-Attr", {
      policyName: "s3kinesis",
      statements: [
        new PolicyStatement({
          actions: ["s3:*"],
          resources: ["arn:aws:s3:::" + ingestBucket.bucketName + "/*"],
        }),
      ],
      roles: [firehoseRole],
    });

    const eventConsumer3KinesisFirehose = new CfnDeliveryStream(
      this,
      "Consumer-3-Firehose",
      {
        s3DestinationConfiguration: {
          bucketArn: ingestBucket.bucketArn,
          bufferingHints: { intervalInSeconds: 60 },
          compressionFormat: "UNCOMPRESSED",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    const eventConsumer3Rule = new Rule(this, "Event-Consumer-3-Kinesis-Rule", {
      description: "Approved Transactions",
      eventPattern: { source: ["com.mycompany.myapp"] },
    });

    eventConsumer3Rule.addTarget(
      new KinesisFirehoseStream(eventConsumer3KinesisFirehose)
    );

    // defines an API Gateway REST API resource backed by our produder lambda function.
    const api = new LambdaRestApi(
      this,
      "SampleAPI-EventBridge-Multi-Consumer",
      {
        handler: eventProducerLambda,
        proxy: false,
      }
    );

    const items = api.root.addResource("items");
    items.addMethod("POST"); // POST /items
  }
}
