#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Config } from './config/configClass';
import { Step1SourceAccount } from './stacks/step1-source-account';
import { Step2DestinationAccount } from './stacks/step2-destination-account';
import { Step3SourceAccount } from './stacks/step3-source-account';

const app = new cdk.App();

// Step 1: Create the replication role in the source account
const step1 = new Step1SourceAccount(app, "Step1SourceAccount", {
  env: {
    account: Config.sourceAccountId,
    region: Config.sourceRegion,
  }
});

// Step 2: Create destination KMS Key & S3 Bucket to replication to and allow the replication role in the source account to reach it.
const step2 = new Step2DestinationAccount(app, "Step2DestinationAccount",
  {
    env: {
      account: Config.destinationAccountId,
      region: Config.destinationRegion
    }
  });


// Step 3: Create source KMS Key & S3 Bucket to replicate from and allow the replication role to access it and replicate it.
const step3 = new Step3SourceAccount(app, "Step3SourceAccount",
  {
    env: {
      account: Config.sourceAccountId,
      region: Config.sourceRegion
    }
  });
