from aws_cdk import (
    Duration,
    Stack,
    aws_logs as logs,
    aws_cloudfront as cloudfront,
    aws_iam as iam,
    aws_s3 as s3,
    aws_kinesisfirehose as firehose,
    aws_s3_deployment as s3_deployment,
    RemovalPolicy,
    CfnOutput,
    CfnParameter,
    CfnMapping
)
from constructs import Construct
from cdk_nag import NagSuppressions

import json

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
        log_retention_days = CfnParameter(
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
        
        # Create the logging bucket for CloudFront
        # This bucket will store logs in Parquet format and from Firehose
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
                    expiration=Duration.days(log_retention_days.value_as_number),  # Configurable log retention
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

        # Deploy the static website content to the S3 bucket
        s3_deploy = s3_deployment.BucketDeployment(
            self, "DeployWebsite",
            sources=[s3_deployment.Source.asset("website")],  # Directory containing your website files
            destination_bucket=main_bucket
        )
        
        # Add bucket policy to deny direct access to S3 objects
        # This ensures content is only accessed through CloudFront
        main_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                effect=iam.Effect.DENY,
                actions=["s3:GetObject"],
                principals=[iam.AnyPrincipal()],
                resources=[main_bucket.arn_for_objects("*")],
                conditions={
                    "StringNotEquals": {
                        "aws:PrincipalServiceName": "cloudfront.amazonaws.com"
                    }
                }
            )
        )

        # Grant CloudFront permission to write logs to the S3 bucket
        cloudfront_distribution_arn = Stack.of(self).format_arn(
            service="cloudfront",
            region="",  # CloudFront is a global service
            resource="distribution",
            resource_name="*"  # Wildcard for all distributions in the account
        )
        
        logging_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontLogDelivery",
                actions=["s3:PutObject"],
                principals=[iam.ServicePrincipal("delivery.logs.amazonaws.com")],
                resources=[f"{logging_bucket.bucket_arn}/*"]
            )
        )

        # Add GetBucketAcl permission required by the log delivery service
        logging_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontLogDeliveryAcl",
                actions=["s3:GetBucketAcl"],
                principals=[iam.ServicePrincipal("delivery.logs.amazonaws.com")],
                resources=[logging_bucket.bucket_arn]
            )
        )

        # Create Origin Access Control for CloudFront to access S3
        # This is the recommended approach instead of Origin Access Identity (OAI)
        cloudfront_oac = cloudfront.CfnOriginAccessControl(
            self, "CloudFrontOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name="S3OAC",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4"
            )
        )

        # Configure the S3 origin for CloudFront
        s3_origin_config = cloudfront.CfnDistribution.OriginProperty(
            domain_name=main_bucket.bucket_regional_domain_name,
            id="S3Origin",
            s3_origin_config=cloudfront.CfnDistribution.S3OriginConfigProperty(
                origin_access_identity=""
            ),
            origin_access_control_id=cloudfront_oac.ref
        )

        # Create CloudFront distribution to serve the website
        distribution = cloudfront.CfnDistribution(
            self, "LoggedDistribution",
            distribution_config=cloudfront.CfnDistribution.DistributionConfigProperty(
                enabled=True,
                default_root_object="index.html",
                origins=[s3_origin_config],
                default_cache_behavior=cloudfront.CfnDistribution.DefaultCacheBehaviorProperty(
                    target_origin_id="S3Origin",
                    viewer_protocol_policy="redirect-to-https",
                    cache_policy_id="658327ea-f89d-4fab-a63d-7e88639e58f6",  # CachingOptimized policy ID
                    compress=True
                ),
                viewer_certificate=cloudfront.CfnDistribution.ViewerCertificateProperty(
                    cloud_front_default_certificate=True,
                    minimum_protocol_version="TLSv1.2_2021",
                ),
                http_version="http2"
            )
        )

        # Add bucket policy to allow CloudFront access to S3 objects
        main_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["s3:GetObject"],
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                resources=[main_bucket.arn_for_objects("*")],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{self.account}:distribution/{distribution.ref}"
                    }
                }
            )
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
                resource_name=distribution.attr_id
            )
        )

        # 2. CLOUDWATCH LOGS DESTINATION
        # Create a CloudWatch Logs group
        # First, create the log group without specifying retention
        log_group = logs.LogGroup(
            self, 
            "DistributionLogGroup"
        )

        # Convert the CloudWatch log retention parameter to RetentionDays enum
        cfn_log_group = log_group.node.default_child
        cfn_log_group.add_property_override(
            "RetentionInDays", 
            cloudwatch_log_retention_days.value_as_number
        )
        
        # Create a CloudWatch delivery destination
        cf_distribution_delivery_destination = logs.CfnDeliveryDestination(
            self,
            "CloudWatchDeliveryDestination",
            name="cloudwatch-destination",
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

        # 4. KINESIS DATA FIREHOSE DESTINATION
        # Create IAM role for Kinesis Firehose with permissions to write to S3
        firehose_role = iam.Role(
            self, "FirehoseRole",
            assumed_by=iam.ServicePrincipal("firehose.amazonaws.com")
        )

        # Add required permissions for Firehose to write to S3
        firehose_role.add_to_policy(iam.PolicyStatement(
            actions=[
                "s3:AbortMultipartUpload",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:PutObject"
            ],
            resources=[
                logging_bucket.bucket_arn,
                f"{logging_bucket.bucket_arn}/*"
            ]
        ))

        # Create Kinesis Firehose delivery stream to buffer and deliver logs to S3
        firehose_stream = firehose.CfnDeliveryStream(
            self, "LoggingFirehose",
            delivery_stream_name="cloudfront-logs-stream",
            delivery_stream_type="DirectPut",
            s3_destination_configuration=firehose.CfnDeliveryStream.S3DestinationConfigurationProperty(
                bucket_arn=logging_bucket.bucket_arn,
                role_arn=firehose_role.role_arn,
                buffering_hints=firehose.CfnDeliveryStream.BufferingHintsProperty(
                    interval_in_seconds=300,  # Buffer for 5 minutes
                    size_in_m_bs=5  # Or until 5MB is reached
                ),
                compression_format="HADOOP_SNAPPY",  # Compress data for efficiency
                prefix="firehose_delivery/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
                error_output_prefix="errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/"
            ),
            delivery_stream_encryption_configuration_input=firehose.CfnDeliveryStream.DeliveryStreamEncryptionConfigurationInputProperty(
                key_type="AWS_OWNED_CMK"
            )
        )

        # Configure Firehose as a delivery destination for CloudFront logs
        firehose_delivery_destination = logs.CfnDeliveryDestination(
            self, "FirehoseDeliveryDestination",
            name="cloudfront-logs-destination",
            destination_resource_arn=firehose_stream.attr_arn,
            output_format="json"
        )

        # Create the Firehose delivery configuration
        delivery = logs.CfnDelivery(
            self,
            "KinesisDelivery",
            delivery_source_name=distribution_delivery_source.name,
            delivery_destination_arn=firehose_delivery_destination.attr_arn
        )
        delivery.node.add_dependency(distribution_delivery_source)

        # Output the CloudFront distribution domain name for easy access
        CfnOutput(
            self, "DistributionDomainName",
            value=distribution.attr_domain_name,
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
        