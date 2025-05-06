from aws_cdk import aws_s3, aws_iam, aws_backup, Stack, Tags
from constructs import Construct


class BackupS3Stack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        bucket = aws_s3.Bucket(
            self,
            "example-bucket",
            access_control=aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            encryption=aws_s3.BucketEncryption.S3_MANAGED,
            block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,
        )
        Tags.of(bucket).add("daily-backup", "true")

        backupRole = self.createBackupRole()

        vault = aws_backup.BackupVault(
            self,
            "Vault",
        )
        plan = aws_backup.BackupPlan.daily35_day_retention(
            self, "demo-backup-plan", vault
        )

        plan.add_selection(
            "Selection",
            role=backupRole,
            resources=[aws_backup.BackupResource.from_tag("daily-backup", "true")],
        )

    def createBackupRole(self):
        backupRole = aws_iam.Role(
            self, "Role", assumed_by=aws_iam.ServicePrincipal("backup.amazonaws.com")
        )

        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=[
                    "s3:GetInventoryConfiguration",
                    "s3:PutInventoryConfiguration",
                    "s3:ListBucketVersions",
                    "s3:ListBucket",
                    "s3:GetBucketVersioning",
                    "s3:GetBucketNotification",
                    "s3:PutBucketNotification",
                    "s3:GetBucketLocation",
                    "s3:GetBucketTagging",
                ],
                resources=["arn:aws:s3:::*"],
                sid="S3BucketBackupPermissions",
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=[
                    "s3:GetObjectAcl",
                    "s3:GetObject",
                    "s3:GetObjectVersionTagging",
                    "s3:GetObjectVersionAcl",
                    "s3:GetObjectTagging",
                    "s3:GetObjectVersion",
                ],
                resources=["arn:aws:s3:::*/*"],
                sid="S3ObjectBackupPermissions",
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=["s3:ListAllMyBuckets"],
                resources=["*"],
                sid="S3GlobalPermissions",
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=["s3:ListAllMyBuckets"],
                resources=["*"],
                sid="S3GlobalPermissions",
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=["kms:Decrypt", "kms:DescribeKey"],
                resources=["*"],
                sid="KMSBackupPermissions",
                conditions={"StringEquals": {"kms:ViaService": "s3.*.amazonaws.com"}},
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=[
                    "events:DescribeRule",
                    "events:EnableRule",
                    "events:PutRule",
                    "events:DeleteRule",
                    "events:PutTargets",
                    "events:RemoveTargets",
                    "events:ListTargetsByRule",
                    "events:DisableRule",
                ],
                resources=["arn:aws:events:*:*:rule/AwsBackupManagedRule*"],
                sid="EventsPermissions",
            )
        )
        backupRole.add_to_policy(
            aws_iam.PolicyStatement(
                actions=["cloudwatch:GetMetricData", "events:ListRules"],
                resources=["*"],
                sid="EventsMetricsGlobalPermissions",
            )
        )
