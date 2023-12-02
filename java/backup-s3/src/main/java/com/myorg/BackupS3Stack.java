package com.myorg;

import software.constructs.Construct;

import java.util.Arrays;
import java.util.List;

import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Tags;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketAccessControl;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.amazon.awscdk.services.backup.BackupPlan;
import software.amazon.awscdk.services.backup.BackupPlanRule;
import software.amazon.awscdk.services.backup.BackupResource;
import software.amazon.awscdk.services.backup.BackupSelectionOptions;
import software.amazon.awscdk.services.backup.BackupVault;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;

public class BackupS3Stack extends Stack {
  public BackupS3Stack(final Construct scope, final String id) {
    this(scope, id, null);
  }

  public BackupS3Stack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    // create s3 bucket
    Bucket bucket = Bucket.Builder.create(this, "my-example-bucket")
        .encryption(BucketEncryption.KMS_MANAGED)
        .accessControl(BucketAccessControl.BUCKET_OWNER_FULL_CONTROL)
        .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
        .versioned(true)
        .build();

    // add daily backup tag to bucket
    Tags.of(bucket).add("daily-backup", "true");

    // create backup vault
    BackupVault vault = BackupVault.Builder.create(this, "BackupVault")
        .removalPolicy(RemovalPolicy.DESTROY)
        .build();

    // create backup plan
    BackupPlan plan = BackupPlan.Builder.create(this, "BackupPlan")
        .backupVault(vault)
        .build();

    // add Rule to Backup Plan
    plan.addRule(BackupPlanRule.daily());

    // create Backup Role
    Role backupRole = Role.Builder.create(this, "backup-role")
        .assumedBy(new ServicePrincipal("backup.amazonaws.com"))
        .build();

    // add managed AWS Backup Service Policy to Role
    backupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSBackupServiceRolePolicyForS3Backup"));

    // add S3 Bucket Permissions to backupRole
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("arn:aws:s3:::*"))
        .actions(Arrays.asList(
            "s3:GetInventoryConfiguration",
            "s3:PutInventoryConfiguration",
            "s3:ListBucketVersions",
            "s3:ListBucket",
            "s3:GetBucketVersioning",
            "s3:GetBucketNotification",
            "s3:PutBucketNotification",
            "s3:GetBucketLocation",
            "s3:GetBucketTagging"))
        .sid("S3BucketBackupPermissions")
        .build());

    // add S3 Object Permissions to backupRole
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("arn:aws:s3:::*/*"))
        .actions(Arrays.asList(
            "s3:GetObjectAcl",
            "s3:GetObject",
            "s3:GetObjectVersionTagging",
            "s3:GetObjectVersionAcl",
            "s3:GetObjectTagging",
            "s3:GetObjectVersion"))
        .sid("S3ObjectBackupPermissions")
        .build());

    // add S3 Global Permissions to backupRole
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("*"))
        .actions(Arrays.asList(
          "s3:ListAllMyBuckets"))
        .sid("S3GlobalPermissions")
        .build());

    // add KMS Backup Permissions to policy
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("*"))
        .actions(Arrays.asList(
          "kms:Decrypt",
          "kms:DescribeKey"))
        .sid("KMSBackupPermissions")
        .build());

    // add Events Persmissions to backupRole
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("arn:aws:events:*:*:rule/AwsBackupManagedRule*"))
        .actions(Arrays.asList(
          "events:DescribeRule",
          "events:EnableRule",
          "events:PutRule",
          "events:DeleteRule",
          "events:PutTargets",
          "events:RemoveTargets",
          "events:ListTargetsByRule",
          "events:DisableRule"))
        .sid("EventsPermissions")
        .build());

    // add Events Metrics Global Persmissions to backupRole
    backupRole.addToPolicy(PolicyStatement.Builder.create()
        .resources(Arrays.asList("*"))
        .actions(Arrays.asList(
          "cloudwatch:GetMetricData",
          "events:ListRules"))
        .sid("EventsMetricsGlobalPermissions")
        .build());

    // add Selection to Plan from daily-backup tag
    plan.addSelection("Selection", BackupSelectionOptions.builder()
        .resources(List.of(BackupResource.fromTag("daily-backup", "true")))
        .role(backupRole)
        .build());

  }
}
