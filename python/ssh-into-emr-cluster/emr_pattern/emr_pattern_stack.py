from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_emr as emr,
    aws_iam as iam,
    aws_s3 as s3,
    Aws,
    aws_s3_deployment as s3deploy,
    RemovalPolicy
)
from uuid import uuid4
from constructs import Construct
class EmrPatternStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, ssh_origin_ip: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        public_subnet_config = ec2.SubnetConfiguration(
            name="public_subnet_configuration",
            subnet_type=ec2.SubnetType.PUBLIC,
            cidr_mask=24,
            map_public_ip_on_launch=True
        )

        private_subnet_config = ec2.SubnetConfiguration(
            name="private_subnet_configuration",
            subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidr_mask=24
        )

        vpc = ec2.Vpc(self, "infrastructure_vpc",
            vpc_name="emr_cdk_vpc",
            nat_gateways=1,
            cidr= '10.0.0.0/16',
            gateway_endpoints=
                {
                    "S3": 
                        ec2.GatewayVpcEndpointOptions(service=ec2.GatewayVpcEndpointAwsService.S3)
                },
            subnet_configuration=[
                public_subnet_config,
                private_subnet_config
            ],
        )

        vpc.apply_removal_policy(RemovalPolicy.RETAIN) # manually delete VPC after running 'cdk destroy' to prevent errors

        ec2_security_group = ec2.SecurityGroup(self, "ec2_sg",
            vpc=vpc,
            description="sg for ec2 instance that will ssh to emr",
            security_group_name="ec2_sg_for_emr_pattern",
            allow_all_outbound=True
        )

        # Scope down EC2 SG to allow SSH only from your IP if provided in app.py
        if ssh_origin_ip:
            ec2_security_group.add_ingress_rule(ec2.Peer.ipv4(f"{ssh_origin_ip}/32"), ec2.Port.tcp(22), 'allow SSH from only one IP')

        # If IP not specified in app.py variables,  allow SSH from any IP (still relatively secure)
        else:
            ec2_security_group.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(22), 'allow SSH from anywhere')


        emr_main_node_security_group = ec2.SecurityGroup(self, "emr_main_node_sg",
            vpc=vpc,
            description="sg for emr main node",
            security_group_name="emr_main_node_sg",
            allow_all_outbound=True
        )

        emr_main_node_security_group.add_ingress_rule(
            ec2.Peer.security_group_id(ec2_security_group.security_group_id), 
            ec2.Port.tcp(22), 
            'allow traffic to emr main node from EC2 SG to allow for SSH'
        )

        emr_core_node_security_group = ec2.SecurityGroup(self, "emr_core_node_sg",
            vpc=vpc,
            description="sg for emr core nodes",
            security_group_name="emr_core_node_sg"
        )

        # EC2 Instance used to SSH into EMR 
        ec2_instance = ec2.Instance(self, "ec2_instance",
            vpc=vpc,
            instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
            machine_image=ec2.MachineImage.latest_amazon_linux(),
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC
            ),
            security_group=ec2_security_group,
            key_name="emr_test"
        )

        # S3 Bucket used for: logging, storing emr scripts, Spark job input data, and Spark job output data
        s3_bucket = s3.Bucket(
            self,
            "s3_bucket",
            bucket_name=f"emr-cdk-pattern-{Aws.ACCOUNT_ID}",
            encryption=s3.BucketEncryption.S3_MANAGED
        )

        s3deploy.BucketDeployment(
            self,
            "upload_test_files_to_s3",
            destination_bucket=s3_bucket,
            destination_key_prefix="pyspark_test",
            sources=[s3deploy.Source.asset("./emr_pattern/src/pyspark_test")]
        )


        #### ALL EMR-SPECIFIC CONSTRUCTS BELOW #######

        emr_security_config = emr.CfnSecurityConfiguration(self, "emr_security_config",
            security_configuration= {
                "EncryptionConfiguration": {
                    "EnableAtRestEncryption": True,
                    "EnableInTransitEncryption": False,
                    "AtRestEncryptionConfiguration": {"S3EncryptionConfiguration": {"EncryptionMode": "SSE-S3"}}
                }
            },
            name="emr_pattern_security_configuration"
        )

        read_scripts_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=["s3:GetObject",],
            resources=[f"arn:aws:s3:::{s3_bucket.bucket_name}/*"],
        )

        read_scripts_document = iam.PolicyDocument()
        read_scripts_document.add_statements(read_scripts_policy)


        emr_service_role = iam.Role(
            self,
            "emr_service_role",
            assumed_by=iam.ServicePrincipal("elasticmapreduce.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonElasticMapReduceRole"
                ),
            ],
            inline_policies={"read_scripts_document": read_scripts_document}
        )


        emr_job_flow_role = iam.Role(
            self,
            "emr_job_flow_role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonElasticMapReduceforEC2Role"
                )
            ],
        )


        emr_job_flow_profile = iam.CfnInstanceProfile(
            self,
            "emr_job_flow_profile",
            roles=[emr_job_flow_role.role_name],
            instance_profile_name="emrJobFlowProfile",
        )


        emr_cluster = emr.CfnCluster(
            self, 
            "emr_cluster",
            name="emr_cluster_cdk_pattern",
            instances=emr.CfnCluster.JobFlowInstancesConfigProperty(
                core_instance_group=emr.CfnCluster.InstanceGroupConfigProperty(
                    instance_count=2, instance_type="m6g.xlarge", market="ON_DEMAND"
                ),
                ec2_key_name="emr_test",
                ec2_subnet_id=vpc.private_subnets[0].subnet_id,
                hadoop_version="Amazon",
                master_instance_group=emr.CfnCluster.InstanceGroupConfigProperty(
                    instance_count=1, instance_type="m6g.xlarge", market="ON_DEMAND"
                ),
                additional_master_security_groups=[emr_main_node_security_group.security_group_id] # add extra SG to allow SSH access
                ),
            job_flow_role=emr_job_flow_profile.instance_profile_name,
            service_role=emr_service_role.role_name,
            release_label="emr-6.8.0",
            applications=[emr.CfnCluster.ApplicationProperty(name="Spark")], # add more Applications here in this list! (ie HBase, Hive, etc...)
            auto_termination_policy= {"IdleTimeout" : 60*60}, #timeout after 1 hr
            log_uri=f"s3://{s3_bucket.bucket_name}/{Aws.REGION}/elasticmapreduce_logs/",
            security_configuration=emr_security_config.name
        )

        emr_cluster.node.add_dependency(vpc) # prevent EMR cluster from spinning up before VPC is created