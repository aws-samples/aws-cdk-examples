from aws_cdk import aws_ec2 as ec2, aws_iam as iam, App, Aws, Stack, aws_emr as emr
from constructs import Construct

class EMRClusterStack(Stack):
    def __init__(
        self,
        scope: Construct,
        id: str,
        s3_log_bucket: str,
        s3_script_bucket: str,
        spark_script: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # VPC
        vpc = ec2.Vpc(
            self,
            "vpc",
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="public", subnet_type=ec2.SubnetType.PUBLIC
                )
            ],
        )

        # enable reading scripts from s3 bucket
        read_scripts_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=["s3:GetObject",],
            resources=[f"arn:aws:s3:::{s3_script_bucket}/*"],
        )
        read_scripts_document = iam.PolicyDocument()
        read_scripts_document.add_statements(read_scripts_policy)

        # emr service role
        emr_service_role = iam.Role(
            self,
            "emr_service_role",
            assumed_by=iam.ServicePrincipal("elasticmapreduce.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonElasticMapReduceRole"
                )
            ],
            inline_policies={
                "read_scripts_document": read_scripts_document
            },
        )

        # emr job flow role
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
        # emr job flow profile
        emr_job_flow_profile = iam.CfnInstanceProfile(
            self,
            "emr_job_flow_profile",
            roles=[emr_job_flow_role.role_name],
            instance_profile_name="emrJobFlowProfile_",
        )

        assert emr_job_flow_profile.instance_profile_name is not None

        # create emr cluster
        emr.CfnCluster(
            self,
            "emr_cluster",
            instances=emr.CfnCluster.JobFlowInstancesConfigProperty(
                core_instance_group=emr.CfnCluster.InstanceGroupConfigProperty(
                    instance_count=3, instance_type="m4.large", market="SPOT"
                ),
                ec2_subnet_id=vpc.public_subnets[0].subnet_id,
                hadoop_version="Amazon",
                keep_job_flow_alive_when_no_steps=False,
                master_instance_group=emr.CfnCluster.InstanceGroupConfigProperty(
                    instance_count=1, instance_type="m4.large", market="SPOT"
                ),
            ),
            # note job_flow_role is an instance profile (not an iam role)
            job_flow_role=emr_job_flow_profile.instance_profile_name,
            name="cluster_name",
            applications=[emr.CfnCluster.ApplicationProperty(name="Spark")],
            service_role=emr_service_role.role_name,
            configurations=[
                # use python3 for pyspark
                emr.CfnCluster.ConfigurationProperty(
                    classification="spark-env",
                    configurations=[
                        emr.CfnCluster.ConfigurationProperty(
                            classification="export",
                            configuration_properties={
                                "PYSPARK_PYTHON": "/usr/bin/python3",
                                "PYSPARK_DRIVER_PYTHON": "/usr/bin/python3",
                            },
                        )
                    ],
                ),
                # enable apache arrow
                emr.CfnCluster.ConfigurationProperty(
                    classification="spark-defaults",
                    configuration_properties={
                        "spark.sql.execution.arrow.enabled": "true"
                    },
                ),
                # dedicate cluster to single jobs
                emr.CfnCluster.ConfigurationProperty(
                    classification="spark",
                    configuration_properties={"maximizeResourceAllocation": "true"},
                ),
            ],
            log_uri=f"s3://{s3_log_bucket}/{Aws.REGION}/elasticmapreduce/",
            release_label="emr-6.0.0",
            visible_to_all_users=False,
            # the job to be done
            steps=[
                emr.CfnCluster.StepConfigProperty(
                    hadoop_jar_step=emr.CfnCluster.HadoopJarStepConfigProperty(
                        jar="command-runner.jar",
                        args=[
                            "spark-submit",
                            "--deploy-mode",
                            "cluster",
                            f"s3://{s3_script_bucket}/scripts/{spark_script}",
                        ],
                    ),
                    name="step_name",
                    action_on_failure="CONTINUE",
                ),
            ],
        )


app = App()
EMRClusterStack(
    app,
    "emr-cluster",
    s3_log_bucket="s3_bucket_logs",
    s3_script_bucket="s3_bucket_scripts",
    spark_script="pyspark_script.py",
)

app.synth()
