from aws_cdk import (
    Aspects,
    Duration,
    Stack,
    RemovalPolicy,
    aws_connect as connect,
    aws_iam as iam,
    aws_kinesisfirehose as firehose,
    aws_kms as kms,
    aws_s3 as s3
)
from cdk_nag import AwsSolutionsChecks
from constructs import Construct


class AmazonConnectStack(Stack):

    def __init__(self, scope: Construct, construct_id: str,  **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Add CDK Nag
        Aspects.of(self).add(AwsSolutionsChecks())

        # Amazon Connect instance
        amazon_connect_instance = connect.CfnInstance(self, "AmazonConnectInstance",
            attributes=connect.CfnInstance.AttributesProperty(
                inbound_calls=True,
                outbound_calls=True,
                auto_resolve_best_voices=False,
                contactflow_logs=True,
                contact_lens=True,
                early_media=False,
                use_custom_tts_voices=False
            ),
            identity_management_type="CONNECT_MANAGED",
            instance_alias="amazon-connect-instance"
        )

        # KMS key for call recordings and transcripts
        call_recordings_key = kms.Key(self, "CallRecordingsKey",
            enable_key_rotation=True,
            pending_window=Duration.days(30),
            alias="amazon-connect-call-recordings-key"
        )

        # Access logs S3 Bucket for call recordings and transcripts
        call_recordings_access_logs_bucket = s3.Bucket(self, "CallRecordingsAccessLogsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=call_recordings_key,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
            versioned=True,
            bucket_name="amazon-connect-call-recordings-access-logs-bucket"
        )

        # S3 Bucket for call recordings and transcripts
        call_recordings_bucket = s3.Bucket(self, "CallRecordingsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=call_recordings_key,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
            versioned=True,
            server_access_logs_bucket=call_recordings_access_logs_bucket,
            bucket_name="amazon-connect-call-recordings-bucket",
            lifecycle_rules=[
                s3.LifecycleRule(
                    enabled=True,
                    expiration=Duration.days(365*2)
                )
            ]
        )

        # Associate S3 bucket with Amazon Connect instance for call recordings and transcripts
        call_recordings_storage_config = connect.CfnInstanceStorageConfig(self, "CallRecordingsStorageConfig",
            instance_arn=amazon_connect_instance.attr_arn,
            resource_type="CALL_RECORDINGS",
            storage_type="S3",

            s3_config=connect.CfnInstanceStorageConfig.S3ConfigProperty(
                bucket_name=call_recordings_bucket.bucket_name,
                bucket_prefix="recordings",
                encryption_config=connect.CfnInstanceStorageConfig.EncryptionConfigProperty(
                    encryption_type="KMS",
                    key_id=call_recordings_key.key_arn
                )
            )
        )

        # IAM Role for CTR Delivery Stream
        ctr_delivery_stream_role = iam.Role(self, "CtrDeliveryStreamRole",
            assumed_by=iam.ServicePrincipal("firehose.amazonaws.com"),
            role_name="amazon-connect-ctr-delivery-stream-role"
        )

        # Grant permissions to the CTR IAM role
        ctr_delivery_stream_role.add_to_policy(iam.PolicyStatement(
            actions=[
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload",
                "s3:GetBucketLocation",
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
                "kms:CreateGrant"
            ],
            resources=[
                call_recordings_bucket.bucket_arn,
                call_recordings_key.key_arn
            ]
        ))

        # Firehose Delivery Stream for CTR
        ctr_delivery_stream = firehose.CfnDeliveryStream(self, "CtrDeliveryStream",
            delivery_stream_name="amazon-connect-ctr-delivery-stream",
            delivery_stream_type="DirectPut",
            delivery_stream_encryption_configuration_input=firehose.CfnDeliveryStream.DeliveryStreamEncryptionConfigurationInputProperty(
                key_type="CUSTOMER_MANAGED_CMK",
                key_arn=call_recordings_key.key_arn
            ),
            s3_destination_configuration=firehose.CfnDeliveryStream.S3DestinationConfigurationProperty(
                bucket_arn=call_recordings_bucket.bucket_arn,
                prefix="ctr/",
                role_arn=ctr_delivery_stream_role.role_arn,
                buffering_hints=firehose.CfnDeliveryStream.BufferingHintsProperty(
                    interval_in_seconds=60
                ),
                encryption_configuration=firehose.CfnDeliveryStream.EncryptionConfigurationProperty(
                    kms_encryption_config=firehose.CfnDeliveryStream.KMSEncryptionConfigProperty(
                        awskms_key_arn=call_recordings_key.key_arn
                    )
                )
            )
        )

        # Associate Firehose Delivery Stream with Amazon Connect instance for CTR
        ctr_storage_config = connect.CfnInstanceStorageConfig(self, "CtrStorageConfig",
            instance_arn=amazon_connect_instance.attr_arn,
            resource_type="CONTACT_TRACE_RECORDS",
            storage_type="KINESIS_FIREHOSE",
            kinesis_firehose_config=connect.CfnInstanceStorageConfig.KinesisFirehoseConfigProperty(
                firehose_arn=ctr_delivery_stream.attr_arn
            )
        )

        # KMS key for scheduled reports
        scheduled_reports_key = kms.Key(self, "ScheduledReportsKey",
            enable_key_rotation=True,
            pending_window=Duration.days(30),
            alias="amazon-connect-scheduled-reports-key"
        )


        # Access logs S3 Bucket for scheduled reports
        scheduled_reports_access_logs_bucket = s3.Bucket(self, "ScheduledReportsAccessLogsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=scheduled_reports_key,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
            bucket_name="amazon-connect-scheduled-reports-access-logs-bucket"
        )

        # S3 Bucket for scheduled reports
        scheduled_reports_bucket = s3.Bucket(self, "ScheduledReportsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=scheduled_reports_key,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
            versioned=True,
            server_access_logs_bucket=scheduled_reports_access_logs_bucket,
            bucket_name="amazon-connect-scheduled-reports-bucket"
        )

        # Associate S3 bucket with Connect instance for scheduled reports
        scheduled_reports_storage_config = connect.CfnInstanceStorageConfig(self, "ScheduledReportsStorageConfig",
            instance_arn=amazon_connect_instance.attr_arn,
            resource_type="SCHEDULED_REPORTS",
            storage_type="S3",

            s3_config=connect.CfnInstanceStorageConfig.S3ConfigProperty(
                bucket_name=scheduled_reports_bucket.bucket_name,
                bucket_prefix="reports",
                encryption_config=connect.CfnInstanceStorageConfig.EncryptionConfigProperty(
                    encryption_type="KMS",
                    key_id=scheduled_reports_key.key_arn
                )
            )
        )

        # Assign phone number
        phone_number = connect.CfnPhoneNumber(self, "PhoneNumber",
            target_arn=amazon_connect_instance.attr_arn,
            country_code="GB",
            description="Inbound Phone Number",
            type="DID"
        )

        # Create hours of operation
        hours_of_operation = connect.CfnHoursOfOperation(self, "HoursOfOperation",
            config=[connect.CfnHoursOfOperation.HoursOfOperationConfigProperty(
                day="MONDAY",
                start_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=9,
                    minutes=0
                ),
                end_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=17,
                    minutes=0
                )
            ),
            connect.CfnHoursOfOperation.HoursOfOperationConfigProperty(
                day="TUESDAY",
                start_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=9,
                    minutes=0
                ),
                end_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=17,
                    minutes=0
                )
            ),
            connect.CfnHoursOfOperation.HoursOfOperationConfigProperty(
                day="WEDNESDAY",
                start_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=9,
                    minutes=0
                ),
                end_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=17,
                    minutes=0
                )
            ),
            connect.CfnHoursOfOperation.HoursOfOperationConfigProperty(
                day="THURSDAY",
                start_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=9,
                    minutes=0
                ),
                end_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=17,
                    minutes=0
                )
            ),
            connect.CfnHoursOfOperation.HoursOfOperationConfigProperty(
                day="FRIDAY",
                start_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=9,
                    minutes=0
                ),
                end_time=connect.CfnHoursOfOperation.HoursOfOperationTimeSliceProperty(
                    hours=17,
                    minutes=0
                )
            )],
            instance_arn=amazon_connect_instance.attr_arn,
            name="Main",
            time_zone="Europe/London",
            description="Business Hours of Operation",
        )
