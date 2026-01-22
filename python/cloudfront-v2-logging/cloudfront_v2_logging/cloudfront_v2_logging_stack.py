from aws_cdk import (
    Duration,
    Stack,
    Size,
    aws_logs as logs,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    aws_s3 as s3,
    aws_kinesisfirehose as firehose,
    aws_s3_deployment as s3_deployment,
    RemovalPolicy,
    CfnOutput,
    CfnParameter,
)
# Import the destinations module from aws-cdk-lib
from aws_cdk.aws_kinesisfirehose import S3Bucket, Compression
from constructs import Construct

class CloudfrontV2LoggingStack(Stack):
    """
    CloudFront V2 Logging Stack
    
    This stack demonstrates how to configure CloudFront Standard Logging V2 with multiple
    delivery destinations including CloudWatch Logs, S3 (Partitioned Parquet format), and Kinesis
    Data Firehose (JSON format).
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # CloudFormation parameters for customization
        s3_log_retention_days = CfnParameter(
            self, "LogRetentionDays",
            type="Number",
            default=30,
            min_value=1,
            max_value=365,
            description="Number of days to retain CloudFront logs in S3"
        )
        
        cloudwatch_log_retention_days = CfnParameter(
            self, "CloudWatchLogRetentionDays",
            type="Number",
            default=30,
            description="Number of days to retain CloudFront logs in CloudWatch Logs",
            allowed_values=[
                "1", "3", "5", "7", "14", "30", "60", "90", 
                "120", "150", "180", "365", "400", "545", "731", 
                "1827", "3653", "0"
            ]
        )
        
        # Create the S3 logging bucket for CloudFront
        # This bucket will store logs from the S3 output in Parquet format and also be the target for our Firehose delivery
        logging_bucket = s3.Bucket(
            self, "CFLoggingBucket",
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            auto_delete_objects=True,
            object_ownership=s3.ObjectOwnership.OBJECT_WRITER,  # Enable ACLs for log delivery
            enforce_ssl=True,
            lifecycle_rules=[
                s3.LifecycleRule(
                    expiration=Duration.days(s3_log_retention_days.value_as_number),  # Configurable log retention
                )
            ]
        )

        # Create the main S3 bucket for your application
        # This bucket will host the static website content
        main_bucket = s3.Bucket(
            self, "OriginBucket",
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,  # Enforce SSL for all requests
            auto_delete_objects=True  # Clean up objects when stack is deleted
        )

        # Deploy the static website content to the S3 bucket with improved options
        s3_deployment.BucketDeployment(
            self, "DeployWebsite",
            sources=[s3_deployment.Source.asset("website")],  # Directory containing your website files
            destination_bucket=main_bucket,
            content_type="text/html",  # Set content type for HTML files
            cache_control=[s3_deployment.CacheControl.max_age(Duration.days(7))],  # Cache for 7 days
            prune=False
        )
        
        # Create CloudWatch Logs group with configurable retention
        log_group = logs.LogGroup(
            self, 
            "DistributionLogGroup",
            retention=self._get_log_retention(cloudwatch_log_retention_days.value_as_number)
        )
        
        # Create Kinesis Firehose delivery stream to buffer and deliver logs to S3 using L2 construct
        # Define S3 destination for Firehose with dynamic prefixes
        s3_destination = S3Bucket(
            bucket=logging_bucket,
            data_output_prefix="firehose_delivery/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
            error_output_prefix="errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/",
            buffering_interval=Duration.seconds(300),  # Buffer for 5 minutes
            buffering_size=Size.mebibytes(5),  # Or until 5MB is reached
            compression=Compression.HADOOP_SNAPPY  # Compress data for efficiency
        )
        
        # Create Kinesis Firehose delivery stream using L2 construct
        firehose_stream = firehose.DeliveryStream(
            self, "LoggingFirehose",
            delivery_stream_name="cloudfront-logs-stream",
            destination=s3_destination,
            encryption=firehose.StreamEncryption.aws_owned_key()
        )

        # Grant permissions for the delivery service to write logs to the S3 bucket
        logging_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontLogDelivery",
                actions=["s3:PutObject"],
                principals=[iam.ServicePrincipal("delivery.logs.amazonaws.com")],
                resources=[f"{logging_bucket.bucket_arn}/*"],
                conditions={
                    "StringEquals": {
                        "aws:SourceAccount": Stack.of(self).account
                    }
                }
            )
        )

        # Add GetBucketAcl permission required by the log delivery service
        logging_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontLogDeliveryAcl",
                actions=["s3:GetBucketAcl"],
                principals=[iam.ServicePrincipal("delivery.logs.amazonaws.com")],
                resources=[logging_bucket.bucket_arn],
                conditions={
                    "StringEquals": {
                        "aws:SourceAccount": Stack.of(self).account
                    }
                }
            )
        )

        # Create CloudFront distribution with S3BucketOrigin
        distribution = cloudfront.Distribution(
            self, "LoggedDistribution",
            comment="CloudFront distribution with STD Logging V2 Configuration Examples",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(main_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress=True
            ),
            default_root_object="index.html",
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,  # Uses TLS 1.2 as minimum
            http_version=cloudfront.HttpVersion.HTTP2,
            enable_logging=False  # We're using CloudFront V2 logging instead of traditional logging
        )

        # SECTION: CLOUDFRONT STANDARD LOGGING V2 CONFIGURATION
        
        # 1. Create the delivery source for CloudFront distribution logs
        # This defines the CloudFront distribution as the source of logs
        distribution_delivery_source = logs.CfnDeliverySource(
            self,
            "DistributionDeliverySource",
            name="distribution-source",
            log_type="ACCESS_LOGS",
            resource_arn=Stack.of(self).format_arn(
                service="cloudfront",
                region="",  # CloudFront is a global service
                resource="distribution",
                resource_name=distribution.distribution_id
            )
        )

        # 2. CLOUDWATCH LOGS DESTINATION
        
        # Create a CloudWatch delivery destination
        cf_distribution_delivery_destination = logs.CfnDeliveryDestination(
            self,
            "CloudWatchDeliveryDestination",
            name="cloudwatch-logs-destination",
            destination_resource_arn=log_group.log_group_arn,
            output_format="json"
        )

        # Create the CloudWatch Logs delivery configuration
        cf_delivery = logs.CfnDelivery(
            self,
            "CloudwatchDelivery",
            delivery_source_name=distribution_delivery_source.name,
            delivery_destination_arn=cf_distribution_delivery_destination.attr_arn
        )
        cf_delivery.node.add_dependency(distribution_delivery_source)
        cf_delivery.node.add_dependency(cf_distribution_delivery_destination)

        # 3. S3 PARQUET DESTINATION
        # Configure S3 as a delivery destination with Parquet format
        s3_distribution_delivery_destination = logs.CfnDeliveryDestination(
            self,
            "S3DeliveryDestination",
            name="s3-destination",
            destination_resource_arn=logging_bucket.bucket_arn,
            output_format="parquet",
        )

        # Create the S3 delivery configuration with Hive-compatible paths
        s3_delivery = logs.CfnDelivery(
            self,
            "S3Delivery",
            delivery_source_name=distribution_delivery_source.name,
            delivery_destination_arn=s3_distribution_delivery_destination.attr_arn,
            s3_enable_hive_compatible_path=True,  # Enable Hive-compatible paths for Athena
            s3_suffix_path="s3_delivery/{DistributionId}/{yyyy}/{MM}/{dd}/{HH}"
        )
        s3_delivery.node.add_dependency(distribution_delivery_source)
        s3_delivery.node.add_dependency(s3_distribution_delivery_destination)
        s3_delivery.node.add_dependency(cf_delivery)  # Make S3 delivery depend on CloudWatch delivery

        # 4. KINESIS DATA FIREHOSE DESTINATION
        # Configure Firehose as a delivery destination for CloudFront logs
        firehose_delivery_destination = logs.CfnDeliveryDestination(
            self, "FirehoseDeliveryDestination",
            name="cloudfront-logs-destination",
            destination_resource_arn=firehose_stream.delivery_stream_arn,
            output_format="json"
        )

        # Create the Firehose delivery configuration
        delivery = logs.CfnDelivery(
            self,
            "Delivery",
            delivery_source_name=distribution_delivery_source.name,
            delivery_destination_arn=firehose_delivery_destination.attr_arn
        )
        delivery.node.add_dependency(distribution_delivery_source)
        delivery.node.add_dependency(firehose_delivery_destination)
        delivery.node.add_dependency(s3_delivery)  # Make Firehose delivery depend on S3 delivery

        # Output the CloudFront distribution domain name for easy access
        CfnOutput(
            self, "DistributionDomainName",
            value=distribution.distribution_domain_name,
            description="CloudFront distribution domain name"
        )
        
        # Output the S3 bucket name where logs are stored
        CfnOutput(
            self, "LoggingBucketName",
            value=logging_bucket.bucket_name,
            description="S3 bucket for CloudFront logs"
        )
        
        # Output the CloudWatch log group name and retention period
        CfnOutput(
            self, "CloudWatchLogGroupName",
            value=f"{log_group.log_group_name} (retention: {cloudwatch_log_retention_days.value_as_number} days)",
            description="CloudWatch log group for CloudFront logs"
        )
    
    def _get_log_retention(self, days):
        """Convert numeric days to logs.RetentionDays enum value"""
        retention_map = {
            0: logs.RetentionDays.INFINITE,
            1: logs.RetentionDays.ONE_DAY,
            3: logs.RetentionDays.THREE_DAYS,
            5: logs.RetentionDays.FIVE_DAYS,
            7: logs.RetentionDays.ONE_WEEK,
            14: logs.RetentionDays.TWO_WEEKS,
            30: logs.RetentionDays.ONE_MONTH,
            60: logs.RetentionDays.TWO_MONTHS,
            90: logs.RetentionDays.THREE_MONTHS,
            120: logs.RetentionDays.FOUR_MONTHS,
            150: logs.RetentionDays.FIVE_MONTHS,
            180: logs.RetentionDays.SIX_MONTHS,
            365: logs.RetentionDays.ONE_YEAR,
            400: logs.RetentionDays.THIRTEEN_MONTHS,
            545: logs.RetentionDays.EIGHTEEN_MONTHS,
            731: logs.RetentionDays.TWO_YEARS,
            1827: logs.RetentionDays.FIVE_YEARS,
            3653: logs.RetentionDays.TEN_YEARS
        }
        return retention_map.get(int(days), logs.RetentionDays.ONE_MONTH)
