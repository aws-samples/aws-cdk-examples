# Use CDK to Setup Cross Account S3 Replication with KMS Encryption

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples es is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

This is a CDK example that shows how to setup Cross Account S3 replication with KMS encryption on both the source and destination buckets.

The process to setup this CDK is in three steps.

1. Create a cross account replication role in the source account with appropriate policies.
2. Create a KMS encryption key and S3 bucket encrypted with KMS in the destination account with appropriate policies.
3. Create a KMS encryption key and S3 bucket encrypted with KMS in the source account with the appropriate policies and with a replication configuration.

## Prerequisites

- Source AWS Account
- Destination AWS Account
- AWS User with sufficient permissions in both Source and Destination AWS Accounts to create the assets.
- AWS CDK SDK installed

## What can I configure?

Setup your variables in the `config/config.json` file in the root of the example.
You can use `config/config.json.template` as a template to create the config file.

```json
{
  "replicationRoleName": "s3-cross-account-replication-role",
  "replicationRolePolicyName": "s3-cross-account-replication-role-policy",
  "sourceAccountId": "{sourceAccountId}",
  "sourceRegion": "us-west-2",
  "sourceBucketName": "source-bucket-to-replicate-from",
  "sourceKmsKeyAlias": "s3-cross-account-replication-source-key",
  "destinationAccountId": "{destinationAccountId}",
  "destinationRegion": "us-west-2",
  "destinationBucketName": "destination-bucket-to-replicate-to",
  "destinationKmsKeyAlias": "s3-cross-account-replication-destination-key"
}
```

## How to setup this project?

Since you are going to deploy resources in two AWS accounts, you'll need to bootstrap this CDK project into both source and destination accounts. Before starting the bootstrap process, you need to configure your aws cli credentials file with two profiles: `source` and `destination`. More information can be found in ![AWS CLI configuration files](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

We are going to use the source account to deploy all the three stacks, so in the destination account we need to create a trust relationship with the source account.
To do this, run the following command:

```bash
cdk bootstrap --trust {sourceAccountId} --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess aws://{destinationAccountId}}/{destinationRegion} --profile destination
```

> Please replace the values in the curly braces with your values.

After bootstrap CDK in the destination account, you can bootstrap CDK in the source account by running the following command:

```bash
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess aws://{sourceAccountId}}/{sourceRegion} --profile source
```

> Please replace the values in the curly braces with your values.<br/>
> You need to setup your variables in the config.json before running the above commands.

## Steps to Deploy

- Clone the repository and move terminal inside it.
- Run `npm install`
- Create and populate the config.json file with the proper source and destination account ids.
- Modify any of the existing values for your preferences for naming / conventions.
- Configure your aws cli credentials file with two profiles: `source` and `destination`.
- Bootstrap destination account: `cdk bootstrap --trust {sourceAccountId} --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess aws://{destinationAccountId}}/{destinationRegion} --profile destination`
  - Update the values in curly braces.
- Bootstrap source account: `cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess aws://{sourceAccountId}}/{sourceRegion} --profile source`
  - Update the values in curly braces.
- Run `cdk deploy Step1SourceAccount --profile source`
  - Note the output parameters to use in the next step
- Run `cdk deploy Step2DestinationAccount --parameters replicationRoleArn=arn:aws:iam::{sourceAccountId}:role/s3-cross-account-replication-role --profile source`
  - Update the values in curly braces.
  - Note the output parameters to use in the next step
- Run `cdk deploy Step3SourceAccount --parameters replicationRoleArn=arn:aws:iam::{sourceAccountId}:role/s3-cross-account-replication-role --parameters destinationKmsKeyArn=arn:aws:kms:us-west-2:{destinationAccountId}:key/{kmsKeyInDestination} --parameters destinationS3BucketArn=arn:aws:s3:::destination-bucket-to-replicate-to --profile source`
  - Update the values in curly braces.

## Testing

- Upload a file to the S3 bucket in the source account
- Verify that the file exists in the bucket in the destination account after a few moments

## Cleanup

- Delete all files in the source and destination S3 buckets
- Run `cdk destroy Step3SourceAccount`
- Run `cdk destroy Step2DestinationAccount`
- Run `cdk destroy Step1SourceAccount`

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
