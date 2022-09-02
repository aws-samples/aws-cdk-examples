from aws_cdk import (
    aws_ec2,
    aws_efs,
    aws_iam,
    aws_lambda,
    aws_s3,
    aws_s3_notifications,
    Duration, RemovalPolicy,
    App, Stack
)

class LambdaDataSyncStack(Stack):
    def __init__(self, app: App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        vpc = aws_ec2.Vpc(self, "vpc", max_azs = 2)
        vpc.add_gateway_endpoint("s3-vpce", service = aws_ec2.GatewayVpcEndpointAwsService.S3)
        vpc.add_interface_endpoint("lambda-vpce", service = aws_ec2.InterfaceVpcEndpointAwsService.LAMBDA_)

        fs = aws_efs.FileSystem(
            self, "efs", vpc = vpc,
            lifecycle_policy = aws_efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode = aws_efs.PerformanceMode.GENERAL_PURPOSE,
            throughput_mode = aws_efs.ThroughputMode.BURSTING,
            removal_policy = RemovalPolicy.DESTROY
        )

        # create a new access point from the filesystem
        # set /export/lambda as the root of the access point
        fs_ap = fs.add_access_point(
            "efs_ap", path="/export/lambda",
            create_acl = aws_efs.Acl(owner_uid="1001", owner_gid="1001", permissions="750"),
            posix_user = aws_efs.PosixUser(uid="1001", gid="1001")
        )

        fn = aws_lambda.Function(
            self, "delete-sync", vpc = vpc,
            code = aws_lambda.Code.from_asset("func"),
            handler = "delete_sync.lambda_handler",
            runtime = aws_lambda.Runtime.PYTHON_3_8,
            timeout = Duration.seconds(300),
            # mount the access point to /mnt/data in the lambda runtime environment
            filesystem = aws_lambda.FileSystem.from_efs_access_point(fs_ap, "/mnt/data")
        )
        fn.role.add_managed_policy(aws_iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3FullAccess"))
        fn.role.add_managed_policy(aws_iam.ManagedPolicy.from_aws_managed_policy_name("AmazonElasticFileSystemClientReadWriteAccess"))

        bucket = aws_s3.Bucket(
            self, "s3",
            access_control = aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            encryption = aws_s3.BucketEncryption.S3_MANAGED,
            block_public_access = aws_s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy = RemovalPolicy.DESTROY,
            auto_delete_objects = True
        )

        trigger = aws_s3_notifications.LambdaDestination(fn)
        trigger.bind(self, bucket)

        # Assign notification for S3 event type (ex. OBJECT_CREATED)
        bucket.add_event_notification(aws_s3.EventType.OBJECT_CREATED_PUT, trigger)
        bucket.add_event_notification(aws_s3.EventType.OBJECT_REMOVED_DELETE, trigger)
