#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Config } from "./config/Config";
import { Step1SourceAccount } from "./stacks/step1-source-account";
import { Step2DestinationAccount } from "./stacks/step2-destination-account";
import { Step3SourceAccount } from "./stacks/step3-source-account";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

const app = new cdk.App();

// Step 1: Create the replication role in the source account
const step1 = new Step1SourceAccount(app, "Step1SourceAccount", {
  env: {
    account: Config.sourceAccountId,
    region: Config.sourceRegion,
  },
});

// Step 2: Create destination KMS Key & S3 Bucket to replication to and allow the replication role in the source account to reach it.
new Step2DestinationAccount(app, "Step2DestinationAccount", {
  env: {
    account: Config.destinationAccountId,
    region: Config.destinationRegion,
  },
});

// Step 3: Create source KMS Key & S3 Bucket to replicate from and allow the replication role to access it and replicate it.
new Step3SourceAccount(app, "Step3SourceAccount", {
  env: {
    account: Config.sourceAccountId,
    region: Config.sourceRegion,
  },
});

cdk.Aspects.of(app).add(new AwsSolutionsChecks());

NagSuppressions.addResourceSuppressions(
  step1,
  [
    {
      id: "AwsSolutions-IAM5",
      reason:
        "Suppress to grant permissions to replicate everything in this bucket",
      appliesTo: [
        `Resource::arn:aws:s3:::${Config.destinationBucketName}/*`,
        `Resource::arn:aws:s3:::${Config.sourceBucketName}/*`,
      ],
    },
  ],
  true
);

NagSuppressions.addResourceSuppressions(
  app,
  [
    {
      id: "AwsSolutions-S1",
      reason:
        "Suppress access logs. Access logs cannot be enabled on buckets with KMS encryption which is the purpose of this example",
    },
  ],
  true
);

NagSuppressions.addResourceSuppressions(
  step1,
  [
    {
      id: "AwsSolutions-IAM5",
      reason:
        "This warning could be heeded, in this example it grants permissions to all keys in the account rather than one specific one",
      appliesTo: [
        `Resource::arn:aws:kms:${Config.destinationRegion}:${Config.destinationAccountId}:key/*`,
        `Resource::arn:aws:kms:${Config.sourceRegion}:${Config.sourceAccountId}:key/*`,
      ],
    },
  ],
  true
);
