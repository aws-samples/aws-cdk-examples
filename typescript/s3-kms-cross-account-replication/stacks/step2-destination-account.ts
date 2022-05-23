import {
  Stack,
  StackProps,
  RemovalPolicy,
  Fn,
  CfnOutput,
  CfnParameter,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Config } from "../config/Config";
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  BucketAccessControl,
} from "aws-cdk-lib/aws-s3";
import { Key } from "aws-cdk-lib/aws-kms";
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  ArnPrincipal,
} from "aws-cdk-lib/aws-iam";

export class Step2DestinationAccount extends Stack {
  public destinationS3Bucket: Bucket;
  public destinationKmsKey: Key;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const replicationRoleArn = new CfnParameter(this, "replicationRoleArn", {
      type: "String",
      description: "The ARN of the replication role in the source account",
    });

    const destinationKmsKey = new Key(
      this,
      `s3-cross-account-replication-dest-key`,
      {
        alias: Config.destinationKmsKeyAlias,
        description:
          "Key used for KMS Encryption for the destination s3 bucket for cross account replication",
        policy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: "Enable IAM User Permissions",
              effect: Effect.ALLOW,
              principals: [
                new ArnPrincipal(
                  `arn:aws:iam::${Config.destinationAccountId}:root`
                ),
              ],
              actions: ["kms:*"],
              resources: ["*"],
            }),
            new PolicyStatement({
              sid: "Enable Replication Permissions",
              effect: Effect.ALLOW,
              principals: [new ArnPrincipal(replicationRoleArn.valueAsString)],
              actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:DescribeKey",
              ],
              resources: ["*"],
            }),
          ],
        }),
        enableKeyRotation: true,
      }
    );

    // Create the destination S3 bucket
    const destinationS3Bucket = new Bucket(
      this,
      "destination-bucket-to-replicate-to",
      {
        bucketName: Config.destinationBucketName,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        versioned: true,
        accessControl: BucketAccessControl.PRIVATE,
        publicReadAccess: false,
        blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL),
        bucketKeyEnabled: true,
        encryption: BucketEncryption.KMS,
        encryptionKey: destinationKmsKey,
        serverAccessLogsPrefix: "_logs",
        enforceSSL: true,
      }
    );

    // allow the principal to have all admin access to bucket
    destinationS3Bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "Set Admin Access",
        effect: Effect.ALLOW,
        principals: [
          new ArnPrincipal(`arn:aws:iam::${Config.destinationAccountId}:root`),
        ],
        actions: ["s3:*"],
        resources: [
          `${destinationS3Bucket.bucketArn}`,
          `${destinationS3Bucket.bucketArn}/*`,
        ],
      })
    );

    // allow the objects in the bucket to be replicated or deleted
    destinationS3Bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "Set permissions for Objects",
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(replicationRoleArn.valueAsString)],
        actions: ["s3:ReplicateObject", "s3:ReplicateDelete"],
        resources: [`${destinationS3Bucket.bucketArn}/*`],
      })
    );

    // allow the files in the bucket to be listed or versioned
    destinationS3Bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "Set permissions on bucket",
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(replicationRoleArn.valueAsString)],
        actions: [
          "s3:List*",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
        ],
        resources: [destinationS3Bucket.bucketArn],
      })
    );

    // allows the ownership to change from the source bucket to the destination bucket
    destinationS3Bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "Allow ownership change",
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(replicationRoleArn.valueAsString)],
        actions: [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ObjectOwnerOverrideToBucketOwner",
          "s3:ReplicateTags",
          "s3:GetObjectVersionTagging",
        ],
        resources: [`${destinationS3Bucket.bucketArn}/*`],
      })
    );

    this.destinationKmsKey = destinationKmsKey;
    this.destinationS3Bucket = destinationS3Bucket;
    new CfnOutput(this, "destinationKmsKeyArn", {
      value: destinationKmsKey.keyArn,
    });
    new CfnOutput(this, "destinationS3Bucket", {
      value: destinationS3Bucket.bucketArn,
    });
  }
}
