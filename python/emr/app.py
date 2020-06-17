from aws_cdk import aws_ec2 as ec2, aws_iam as iam, core, aws_emr as emr


class EMRClusterStack(core.Stack):
    def __init__(
        self,
        scope: core.Construct,
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
            inline_policies=[read_scripts_document],
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

        # create emr cluster
        emr.CfnCluster(
            self,
            "emr_cluster",
            instances={
                "coreInstanceGroup": {
                    "instanceCount": 3,
                    "instanceType": "m4.large",
                    "market": "SPOT",
                    "name": "Core Instance",
                },
                "ec2SubnetId": vpc.public_subnets[0].subnet_id,
                "hadoopVersion": "Amazon",
                "keepJobFlowAliveWhenNoSteps": False,
                "masterInstanceGroup": {
                    "instanceCount": 1,
                    "instanceType": "m4.large",
                    "market": "SPOT",
                    "name": "Master Instance",
                },
            },
            # note job_flow_role is an instance profile (not an iam role)
            job_flow_role=emr_job_flow_profile.instance_profile_name,
            name="cluster_name",
            service_role=emr_service_role.role_name,
            applications=[{"name": "Spark"}],
            configurations=[
                # use python3 for pyspark
                {
                    "classification": "spark-env",
                    "configurations": [
                        {
                            "classification": "export",
                            "configurationProperties": {
                                "PYSPARK_PYTHON": "/usr/bin/python3",
                                "PYSPARK_DRIVER_PYTHON": "/usr/bin/python3",
                            },
                        }
                    ],
                },
                # enable apache arrow
                {
                    "classification": "spark-defaults",
                    "configurationProperties": {
                        "spark.sql.execution.arrow.enabled": "true"
                    },
                },
                # dedicate cluster to single jobs
                {
                    "classification": "spark",
                    "configurationProperties": {"maximizeResourceAllocation": "true"},
                },
            ],
            log_uri=f"s3://{s3_log_bucket}/{core.Aws.REGION}/elasticmapreduce/",
            release_label="emr-6.0.0",
            visible_to_all_users=False,
            # the job to be done
            steps=[
                {
                    "actionOnFailure": "CONTINUE",
                    "hadoopJarStep": {
                        "jar": "command-runner.jar",
                        "args": [
                            "spark-submit",
                            "--deploy-mode",
                            "cluster",
                            f"s3://{s3_script_bucket}/scripts/{spark_script}",
                        ],
                    },
                    "name": "step_name",
                }
            ],
        )


app = core.App()
EMRClusterStack(
    app,
    "emr-cluster",
    s3_log_bucket="s3_bucket_logs",
    s3_script_bucket="s3_bucket_scripts",
    spark_script="pyspark_script.py",
)

app.synth()
