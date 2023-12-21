# Note: MSK cluster takes almost 40 mins to deploy

# To use the experimental L2 constructs for Managed Apache Flink and Managed Apache Kafka, install the following: 
# pip install aws-cdk.aws_kinesisanalytics_flink_alpha
# pip install aws-cdk.aws_msk_alpha

from aws_cdk import (
    # Duration,
    NestedStack,
    Stack,
    RemovalPolicy,
    Fn,
    # aws_sqs as sqs,
    aws_ec2 as ec2,
    aws_msk as msk,
    aws_s3 as s3,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_events_targets as targets,
    aws_events as events,
    Duration,
    aws_s3_assets as assets,
    aws_s3_deployment as s3deployment,
    aws_logs as logs,
    aws_sns as sns,
    aws_lambda_event_sources,
)
from constructs import Construct
import aws_cdk.aws_kinesisanalytics_flink_alpha as flink # L2 Construct for Managed Apache Flink 
import aws_cdk.aws_msk_alpha as msk_alpha # L2 Construct for Managed Apache Kafka


class FlinkStack(NestedStack):
    def __init__(self, 
                scope: Construct, 
                construct_id: str, 
                vpc,
                security_group,
                bootstrap_brokers,
                **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        
        # Bucket where output of Apache Flink is stored 
        output_bucket = s3.Bucket(
            self,
            "flink-output-bucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )
        
        # Bucket where code for Apache Flink is stored 
        flink_code_bucket = s3.Bucket(
            self,
            "flink-code-bucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            # REMOVE FOR PRODUCTION
            removal_policy = RemovalPolicy.DESTROY,
            auto_delete_objects= True
        )

        flink_app_code_zip = s3deployment.BucketDeployment(self, "flink_app_code_zip",
            sources=[s3deployment.Source.asset("./PythonKafkaSink/PythonKafkaSink.zip")],
            destination_bucket=flink_code_bucket,
            extract=False
        )
        
        # Apache Flink Application
        flink_app = flink.Application(self, "Flink-App",
            code=flink.ApplicationCode.from_asset("./PythonKafkaSink/PythonKafkaSink.zip"),
            runtime=flink.Runtime.FLINK_1_11,
            vpc=vpc,
            security_groups=[security_group],
            property_groups=
            {
               "kinesis.analytics.flink.run.options" : {
                    "python" : "PythonKafkaSink/main.py", 
                    "jarfile" : "PythonKafkaSink/lib/flink-sql-connector-kafka_2.11-1.11.2.jar" 
                }
                    ,
               "producer.config.0" : {
                    "input.topic.name" : "kfp_sensor_topic",
                    "bootstrap.servers": bootstrap_brokers
                },
                "consumer.config.0": {
                    "output.topic.name": "kfp_sns_topic",
                    "output.s3.bucket": output_bucket.bucket_name
                }
            }
        )
        
        # Grant Apache Flink access to read and write to output bucket
        output_bucket.grant_read_write(flink_app)
        
        
        
        
class LambdaStack(NestedStack):
    def __init__(self, 
            scope: Construct, 
            construct_id: str,
            vpc,
            security_group,
            cluster_arn,
            **kwargs):
        super().__init__(scope, construct_id, **kwargs)
    
        # IAM Role used by Lambda functions
        lambda_role = iam.Role(
            self,
            "lambda-role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            # WARNING: Tighten up policies used 
            managed_policies=[iam.ManagedPolicy.from_aws_managed_policy_name("AmazonMSKFullAccess"),
                               iam.ManagedPolicy.from_aws_managed_policy_name("AmazonEC2FullAccess"),
                               iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSNSFullAccess"),
                               iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"),
                               ],
        )
            
        # Producer Function
        lambdaFn = lambda_.Function(
            self, "kfpLambdaStreamProducer",
            code=lambda_.Code.from_asset("./LambdaFunctions"),
            handler="kfpLambdaStreamProducer.lambda_handler",
            timeout=Duration.seconds(50),
            runtime=lambda_.Runtime.PYTHON_3_8,
            environment={'topicName':'kfp_sensor_topic',
                         'mskClusterArn':cluster_arn},
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType('PRIVATE_WITH_EGRESS')),
            role=lambda_role,
            security_groups=[security_group], # WARNING: tighten up security group 
        )
        
        # SNS Alarm Topic
        alarm_sns_topic = sns.Topic(self, "alarm_sns_topic",
            display_name="Temperature Alarm Topic"
        )
        
        # SNS Function
        sns_lambdaFn = lambda_.Function(
            self, "sns_alarm_function",
            code=lambda_.Code.from_asset("./LambdaFunctions"),
            handler="kfpLambdaConsumerSNS.lambda_handler",
            timeout=Duration.seconds(300),
            runtime=lambda_.Runtime.PYTHON_3_8,
            environment={'SNSTopicArn':alarm_sns_topic.topic_arn},
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType('PRIVATE_WITH_EGRESS')),
            role=lambda_role,
            security_groups=[security_group],# WARNING: tighten up security group 
        )
        
        sns_lambdaFn.add_event_source(aws_lambda_event_sources.ManagedKafkaEventSource(
            cluster_arn=cluster_arn,
            topic='kfp_sns_topic',
            starting_position=lambda_.StartingPosition.TRIM_HORIZON
        ))

        # Run Producer Lambda function every 300 seconds
        # See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
        rule = events.Rule(
            self, "scheduledEvent",
            schedule=events.Schedule.rate(Duration.seconds(300)),
        )
        rule.add_target(targets.LambdaFunction(lambdaFn))
    
    
    


class MSKFlinkStreamingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        vpc = ec2.Vpc(self, 
            "MSK-VPC",
            #cidr=172.1.0.0/16,
            nat_gateways=1,
            )
            
        # Security Group that allows all traffic within itself 
        all_sg = ec2.SecurityGroup(self,
            "all_sg", 
            vpc=vpc,
            allow_all_outbound=True,
        )
            
        all_sg.add_ingress_rule(
          all_sg,
          ec2.Port.all_traffic(), # TODO: Change to port just needed by MSK
          "allow all traffic in SG",
        )

        # Load cluster configurations from file
        # Currently still need to use the L1 MSK construct to load a config file
        config_file = open('./cluster_config', 'r')
        server_properties = config_file.read()
        cfn_configuration = msk.CfnConfiguration(self, "MyCfnConfiguration",
            name="MSKConfig",
            server_properties=server_properties
        )

        # MSK Cluster - L2 Construct (Experimental)
        msk_cluster = msk_alpha.Cluster(self, "msk-cluster",
            cluster_name="msk-cluster",
            kafka_version=msk_alpha.KafkaVersion.V2_3_1,
            vpc=vpc,
            encryption_in_transit=msk_alpha.EncryptionInTransitConfig(
                client_broker=msk_alpha.ClientBrokerEncryption.PLAINTEXT, # TODO: Change to TLS
            ),
            configuration_info=msk_alpha.ClusterConfigurationInfo(
                arn=cfn_configuration.attr_arn,
                revision=1
            ),
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType('PRIVATE_WITH_EGRESS')),
            security_groups=[all_sg],
            instance_type=ec2.InstanceType("kafka.m5.large")
        )
        
        
        lambdaStack = LambdaStack(self, "LambdaStack",
            vpc=vpc,
            security_group=all_sg,
            cluster_arn=msk_cluster.cluster_arn
        )
        
        flinkStack = FlinkStack(self, "FlinkStack",
            vpc=vpc,
            security_group=all_sg,
            bootstrap_brokers=msk_cluster.bootstrap_brokers
        )
        
        

    

        
        
