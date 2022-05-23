import {
  Stack,
  StackProps,
  CfnOutput,
  Aws,
  CfnParameter,
  Fn,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Config } from "../config/Config";
import {
  Effect,
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  Policy,
} from "aws-cdk-lib/aws-iam";

export class Step1SourceAccount extends Stack {
  public replicationRole: Role;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const crossAccountReplicationRole = new Role(
      this,
      "s3-cross-account-replication-role",
      {
        assumedBy: new ServicePrincipal("s3.amazonaws.com"),
        roleName: Config.replicationRoleName,
        description: "Role used to replicate across accounts for S3 buckets",
        path: "/",
      }
    );

    const crossAccountReplicationRolePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:ListBucket",
            "s3:GetReplicationConfiguration",
            "s3:GetObjectVersionForReplication",
            "s3:GetObjectVersionAcl",
            "s3:GetObjectVersionTagging",
            "s3:GetObjectRetention",
            "s3:GetObjectLegalHold",
          ],
          resources: [
            `arn:aws:s3:::${Config.sourceBucketName}`,
            `arn:aws:s3:::${Config.sourceBucketName}/*`,
            `arn:aws:s3:::${Config.destinationBucketName}`,
            `arn:aws:s3:::${Config.destinationBucketName}/*`,
          ],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:ReplicateObject",
            "s3:ReplicateDelete",
            "s3:ReplicateTags",
            "s3:ObjectOwnerOverrideToBucketOwner",
          ],
          resources: [
            `arn:aws:s3:::${Config.sourceBucketName}/*`,
            `arn:aws:s3:::${Config.destinationBucketName}/*`,
          ],
        }),
        new PolicyStatement({
          sid: "AllowPermissionsToDoEncryption",
          effect: Effect.ALLOW,
          actions: ["kms:Encrypt"],
          resources: [
            `arn:aws:kms:${Config.destinationRegion}:${Config.destinationAccountId}:key/*`,
          ],
        }),
        new PolicyStatement({
          sid: "AllowPermissionsToDoDecryption",
          effect: Effect.ALLOW,
          actions: ["kms:Decrypt"],
          resources: [
            `arn:aws:kms:${Config.sourceRegion}:${Config.sourceAccountId}:key/*`,
          ],
        }),
      ],
    });
    crossAccountReplicationRole.attachInlinePolicy(
      new Policy(this, Config.replicationRolePolicyName, {
        policyName: Config.replicationRolePolicyName,
        document: crossAccountReplicationRolePolicy,
      })
    );

    this.replicationRole = crossAccountReplicationRole;
    new CfnOutput(this, "crossAccountReplicationRoleArn", {
      value: crossAccountReplicationRole.roleArn,
    });
  }
}
