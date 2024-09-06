from aws_cdk import (
    aws_codebuild as codebuild,
    aws_codedeploy as codedeploy,
    aws_codepipeline as pipeline,
    aws_codepipeline_actions as pipelineactions,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecr as ecr,
    aws_elasticloadbalancingv2 as elb,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_secretsmanager as secretsmanager,
    custom_resources as custom,
    CfnOutput,
    Duration,
    Stack,
)
from constructs import Construct
import os
import json


class CodepipelineBuildDeployStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Consts
        default_region = "us-east-1"
        github_owner_name = "your github username"  # replace with your github username
        github_pat_secret_name = "github_access_token"
        github_repo_name = "python-cdk-example"  # add a unique suffix -xxx if you want to launch multiple cdk deploy in parallel
        sdk_for_pandas_layer_arn = (
            "arn:aws:lambda:us-east-1:336392948345:layer:AWSSDKPandas-Python39:25"
        )
        git_layer_arn = "arn:aws:lambda:us-east-1:553035198032:layer:git-lambda2:8"
        alb_blue_tg = "alb-blue-tg"  # add a unique suffix -xxx if you want to launch multiple cdk deploy in parallel
        alb_green_tg = "alb-green-tg"  # add a unique suffix -xxx if you want to launch multiple cdk deploy in parallel
        pipeline_name = "GithubImageBuildDeployPipeline" # add a unique suffix -xxx if you want to launch multiple cdk deploy in parallel

        github_token_secret = secretsmanager.Secret.from_secret_name_v2(
            self, "GitHubTokenSecret", github_pat_secret_name
        )

        # Create a Lambda function to handle GitHub repo creation
        github_repo_creator = lambda_.Function(
            self,
            "GitHubRepoCreator",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/github_repo_creator"),
            layers=[
                lambda_.LayerVersion.from_layer_version_arn(
                    self, "AWSSDKPandasLayer", sdk_for_pandas_layer_arn
                ),
                lambda_.LayerVersion.from_layer_version_arn(
                    self, "GitLayer", git_layer_arn
                ),
            ],
            timeout=Duration.seconds(30),  # Set timeout to 30 seconds
            environment={
                "HOME": "/tmp",
                "GIT_CONFIG_NOSYSTEM": "1",
                "DEFAULT_REGION": default_region,
                "GITHUB_TOKEN_SECRET_NAME": github_pat_secret_name,
                "GITHUB_OWNER_NAME": github_owner_name,
                "GITHUB_REPO_NAME": github_repo_name,
            },
        )

        # Grant the Lambda function permission to read the secret
        github_token_secret.grant_read(github_repo_creator)
        # Grant the Lambda function permission to manage source credentials
        github_repo_creator.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "codebuild:ImportSourceCredentials",
                    "codebuild:DeleteSourceCredentials",
                    "codebuild:ListSourceCredentials",
                ],
                resources=["*"],
            )
        )

        # Create a custom resource that uses the Lambda function
        create_repo = custom.AwsCustomResource(
            self,
            "GitHubRepo",
            on_create=custom.AwsSdkCall(
                service="Lambda",
                action="invoke",
                parameters={
                    "FunctionName": github_repo_creator.function_name,
                    "Payload": json.dumps(
                        {
                            "dir_path": "app/"  # applicaiton assets under lambda/github_repo_creator
                        }
                    ),
                },
                physical_resource_id=custom.PhysicalResourceId.of("GitHubRepo"),
            ),
            policy=custom.AwsCustomResourcePolicy.from_statements(
                [
                    iam.PolicyStatement(
                        actions=["lambda:InvokeFunction"],
                        resources=[github_repo_creator.function_arn],
                    )
                ]
            ),
        )

        # Creates an Elastic Container Registry (ECR) image repository
        image_repo = ecr.Repository(self, "ImageRepo")

        # Creates a Task Definition for the ECS Fargate service
        fargate_task_def = ecs.FargateTaskDefinition(self, "FargateTaskDef")
        fargate_task_def.add_container(
            "Container",
            container_name="web",
            image=ecs.ContainerImage.from_ecr_repository(image_repo),
            port_mappings=[{"containerPort": 80}],
        )

        # CodeBuild project that builds the Docker image
        build_image = codebuild.Project(
            self,
            "BuildImage",
            build_spec=codebuild.BuildSpec.from_source_filename("buildspec.yaml"),
            source=codebuild.Source.git_hub(
                owner=github_owner_name,
                repo=github_repo_name,
                webhook=True,
                branch_or_ref="main",
            ),
            environment=codebuild.BuildEnvironment(privileged=True),
            environment_variables={
                "AWS_ACCOUNT_ID": codebuild.BuildEnvironmentVariable(
                    value=os.getenv("CDK_DEFAULT_ACCOUNT") or ""
                ),
                "REGION": codebuild.BuildEnvironmentVariable(
                    value=os.getenv("CDK_DEFAULT_REGION") or ""
                ),
                "IMAGE_TAG": codebuild.BuildEnvironmentVariable(value="latest"),
                "IMAGE_REPO_NAME": codebuild.BuildEnvironmentVariable(
                    value=image_repo.repository_name
                ),
                "REPOSITORY_URI": codebuild.BuildEnvironmentVariable(
                    value=image_repo.repository_uri
                ),
                "TASK_DEFINITION_ARN": codebuild.BuildEnvironmentVariable(
                    value=fargate_task_def.task_definition_arn
                ),
                "TASK_ROLE_ARN": codebuild.BuildEnvironmentVariable(
                    value=fargate_task_def.task_role.role_arn
                ),
                "EXECUTION_ROLE_ARN": codebuild.BuildEnvironmentVariable(
                    value=fargate_task_def.execution_role.role_arn
                ),
            },
        )

        # Make sure the CodeBuild project depends on the repository creation
        build_image.node.add_dependency(create_repo)

        # Grants CodeBuild project access to pull/push images from/to ECR repo
        image_repo.grant_pull_push(build_image)

        # Lambda function that triggers CodeBuild image build project
        trigger_code_build = lambda_.Function(
            self,
            "BuildLambda",
            architecture=lambda_.Architecture.ARM_64,
            code=lambda_.Code.from_asset("lambda"),
            handler="trigger-build.handler",
            runtime=lambda_.Runtime.NODEJS_18_X,
            environment={
                "CODEBUILD_PROJECT_NAME": build_image.project_name,
                "REGION": os.getenv("CDK_DEFAULT_REGION") or "",
            },
            # Allows this Lambda function to trigger the buildImage CodeBuild project
            initial_policy=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["codebuild:StartBuild"],
                    resources=[build_image.project_arn],
                )
            ],
        )

        # Triggers a Lambda function using AWS SDK
        trigger_lambda = custom.AwsCustomResource(
            self,
            "BuildLambdaTrigger",
            install_latest_aws_sdk=True,
            policy=custom.AwsCustomResourcePolicy.from_statements(
                [
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=["lambda:InvokeFunction"],
                        resources=[trigger_code_build.function_arn],
                    )
                ]
            ),
            on_create={
                "service": "Lambda",
                "action": "invoke",
                "physical_resource_id": custom.PhysicalResourceId.of("id"),
                "parameters": {
                    "FunctionName": trigger_code_build.function_name,
                    "InvocationType": "Event",
                },
            },
            on_update={
                "service": "Lambda",
                "action": "invoke",
                "parameters": {
                    "FunctionName": trigger_code_build.function_name,
                    "InvocationType": "Event",
                },
            },
        )

        # Creates VPC for the ECS Cluster
        cluster_vpc = ec2.Vpc(
            self,
            "ClusterVpc",
            ip_addresses=ec2.IpAddresses.cidr(cidr_block="10.75.0.0/16"),
        )

        # Deploys the cluster VPC after the initial image build triggers
        cluster_vpc.node.add_dependency(trigger_lambda)

        # Creates a new blue Target Group that routes traffic from the public Application Load Balancer (ALB) to the
        # registered targets within the Target Group e.g. (EC2 instances, IP addresses, Lambda functions)
        # https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
        target_group_blue = elb.ApplicationTargetGroup(
            self,
            "BlueTargetGroup",
            target_group_name=alb_blue_tg,
            target_type=elb.TargetType.IP,
            port=80,
            vpc=cluster_vpc,
        )

        # Creates a new green Target Group
        target_group_green = elb.ApplicationTargetGroup(
            self,
            "GreenTargetGroup",
            target_group_name=alb_green_tg,
            target_type=elb.TargetType.IP,
            port=80,
            vpc=cluster_vpc,
        )

        # Creates a Security Group for the Application Load Balancer (ALB)
        albSg = ec2.SecurityGroup(
            self, "AlbSecurityGroup", vpc=cluster_vpc, allow_all_outbound=True
        )
        albSg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(80),
            description="Allows access on port 80/http",
            remote_rule=False,
        )

        # Creates a public ALB
        public_alb = elb.ApplicationLoadBalancer(
            self,
            "PublicAlb",
            vpc=cluster_vpc,
            internet_facing=True,
            security_group=albSg,
        )

        # Adds a listener on port 80 to the ALB
        alb_listener = public_alb.add_listener(
            "AlbListener80",
            open=False,
            port=80,
            default_target_groups=[target_group_blue],
        )

        # Creates an ECS Fargate service
        fargate_service = ecs.FargateService(
            self,
            "FargateService",
            desired_count=1,
            service_name="fargate-frontend-service",
            task_definition=fargate_task_def,
            cluster=ecs.Cluster(
                self,
                "EcsCluster",
                enable_fargate_capacity_providers=True,
                vpc=cluster_vpc,
            ),
            # Sets CodeDeploy as the deployment controller
            deployment_controller=ecs.DeploymentController(
                type=ecs.DeploymentControllerType.CODE_DEPLOY
            ),
        )

        # Adds the ECS Fargate service to the ALB target group
        fargate_service.attach_to_application_target_group(target_group_blue)

        # Creates new pipeline artifacts
        source_artifact = pipeline.Artifact("SourceArtifact")
        build_artifact = pipeline.Artifact("BuildArtifact")

        # Creates the source stage for CodePipeline
        source_stage = pipeline.StageProps(
            stage_name="Source",
            actions=[
                pipelineactions.GitHubSourceAction(
                    action_name="GitHub",
                    owner=github_owner_name,
                    branch="main",
                    oauth_token=github_token_secret.secret_value,
                    output=source_artifact,
                    repo=github_repo_name,
                    trigger=pipelineactions.GitHubTrigger.WEBHOOK,
                )
            ],
        )

        # Creates the build stage for CodePipeline
        build_stage = pipeline.StageProps(
            stage_name="Build",
            actions=[
                pipelineactions.CodeBuildAction(
                    action_name="DockerBuildPush",
                    input=pipeline.Artifact("SourceArtifact"),
                    project=build_image,
                    outputs=[build_artifact],
                )
            ],
        )

        # Creates a new CodeDeploy Deployment Group
        deployment_group = codedeploy.EcsDeploymentGroup(
            self,
            "CodeDeployGroup",
            service=fargate_service,
            # Configurations for CodeDeploy Blue/Green deployments
            blue_green_deployment_config=codedeploy.EcsBlueGreenDeploymentConfig(
                listener=alb_listener,
                blue_target_group=target_group_blue,
                green_target_group=target_group_green,
            ),
        )

        # Creates the deploy stage for CodePipeline
        deploy_stage = pipeline.StageProps(
            stage_name="Deploy",
            actions=[
                pipelineactions.CodeDeployEcsDeployAction(
                    action_name="EcsFargateDeploy",
                    app_spec_template_input=build_artifact,
                    task_definition_template_input=build_artifact,
                    deployment_group=deployment_group,
                )
            ],
        )

        # Creates an AWS CodePipeline with source, build, and deploy stages
        pipeline.Pipeline(
            self,
            "BuildDeployPipeline",
            pipeline_name=pipeline_name,
            stages=[source_stage, build_stage, deploy_stage],
        )

        # Outputs the ALB public endpoint
        CfnOutput(
            self,
            "PublicAlbEndpoint",
            value=f"http://{public_alb.load_balancer_dns_name}",
        )
