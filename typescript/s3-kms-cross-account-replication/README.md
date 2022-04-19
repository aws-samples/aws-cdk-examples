# Cross Account S3 Replication with KMS Encryption
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example uses the core CDK library, and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This is a CDK example that shows how to setup Cross Account S3 replication with KMS encryption on both the source and destination buckets.

The process to setup this CDK is in three steps.
1) Create a cross account replication role in the source account with appropriate policies.
2) Create a KMS encryption key and S3 bucket encrypted with KMS in the destination account with appropriate policies.
3) Create a KMS encryption key and S3 bucket encrypted with KMS in the source account with the appropriate policies and with a replication configuration.


---
## Build
To build this app, you need to be in this example's root folder. Then run the following:
```bash
npm install -g aws-cdk
npm install
npm run build
```
This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

---
## Prerequisites
* Source AWS Account
* Destination AWS Account
* AWS User with sufficient permissions in both Source and Destination AWS Accounts to create the assets.
* AWS CDK SDK installed

---
## How to setup this project?
You'll need to bootstrap this CDK project into both source and destination accounts.
You can use the following command to add your source account to the destination account as a trusted resource.
Please replace the values in the curly braces with your values.

```bash
cdk bootstrap --trust {sourceAccountId} --cloudformation - execution - policies arn:aws:iam::aws:policy/AdministratorAccess aws://{destinationAccountId}}/{destinationRegion}
```

---
## What can I configure?
Setup your variables in the `config/config.json` file.

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

---
## Deploy
1. Clone the repository and move terminal inside it.
1. Run `npm install`
1. Populate the config.json file with the proper source and destination account ids.
1. Modify any of the existing values for your preferences for naming / conventions.
1. Assume a role within the source account.
1. Update the values with curley braces and run command
  ```bash
  cdk bootstrap --trust {sourceAccountId} --cloudformation - execution - policies arn:aws:iam::aws:policy/AdministratorAccess aws://{destinationAccountId}}/{destinationRegion}
  ```
1. Run command
  ```bash
  cdk deploy Step1SourceAccount
  ```
1. Update the values in curly braces from `Outputs` in previous step, run command
  ```bash
  cdk deploy Step2DestinationAccount --parameters replicationRoleArn=arn:aws:iam::{sourceAccountId}:role/s3-cross-account-replication-role
  ```
1. Update the values in curly braces from `Outputs` in previous step, run command
  ```bash
  cdk deploy Step3SourceAccount --parameters replicationRoleArn=arn:aws:iam::{sourceAccountId}:role/s3-cross-account-replication-role --parameters destinationKmsKeyArn=arn:aws:kms:us-west-2:{destinationAccountId}:key/{kmsKeyInDestination} --parameters destinationS3BucketArn=arn:aws:s3:::destination-bucket-to-replicate-to
  ```

---
## Testing
* Upload a file to the S3 bucket in the source account
* Verify that the file exists in the bucket in the destination account after a few moments


---
## Cleanup
* Run `cdk destroy Step3SourceAccount`
* Run `cdk destroy Step2DestinationAccount`
* Run `cdk destroy Step1SourceAccount`


---
## Useful commands
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
