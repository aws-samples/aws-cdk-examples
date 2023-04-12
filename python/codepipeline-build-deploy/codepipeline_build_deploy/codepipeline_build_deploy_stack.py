from aws_cdk import (
    aws_codebuild as codebuild,
    aws_codecommit as codecommit,
    aws_codedeploy as codedeploy,
    aws_codepipeline as pipeline,
    aws_codepipeline_actions as pipelineactions,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecr as ecr,
    aws_elasticloadbalancingv2 as elb,
    aws_iam as iam,
    aws_lambda as lambda_,
    custom_resources as custom,
    CfnOutput,
    Stack,
)
from constructs import Construct
import os


class CodepipelineBuildDeployStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Creates an AWS CodeCommit repository
        code_repo = codecommit.Repository(
            self, "CodeRepo",
            repository_name="simple-app-code-repo",
            # Copies files from app directory to the repo as the initial commit
            code=codecommit.Code.from_directory("app", "main")
        )

        # Creates an Elastic Container Registry (ECR) image repository
        image_repo = ecr.Repository(self, "ImageRepo")

        # Creates a Task Definition for the ECS Fargate service
        fargate_task_def = ecs.FargateTaskDefinition(self, "FargateTaskDef")
        fargate_task_def.add_container(
            "Container",
            container_name="web",
            image=ecs.ContainerImage.from_ecr_repository(image_repo),
            port_mappings=[{"containerPort": 80}]
        )

        # CodeBuild project that builds the Docker image
        build_image = codebuild.Project(
            self, "BuildImage",
            build_spec=codebuild.BuildSpec.from_source_filename(
                "buildspec.yaml"),
            source=codebuild.Source.code_commit(
                repository=code_repo,
                branch_or_ref="main"
            ),
            environment=codebuild.BuildEnvironment(
                privileged=True
            ),
            environment_variables={
                "AWS_ACCOUNT_ID": codebuild.BuildEnvironmentVariable(value=os.getenv('CDK_DEFAULT_ACCOUNT') or ""),
                "REGION": codebuild.BuildEnvironmentVariable(value=os.getenv('CDK_DEFAULT_REGION') or ""),
                "IMAGE_TAG": codebuild.BuildEnvironmentVariable(value="latest"),
                "IMAGE_REPO_NAME": codebuild.BuildEnvironmentVariable(value=image_repo.repository_name),
                "REPOSITORY_URI": codebuild.BuildEnvironmentVariable(value=image_repo.repository_uri),
                "TASK_DEFINITION_ARN": codebuild.BuildEnvironmentVariable(value=fargate_task_def.task_definition_arn),
                "TASK_ROLE_ARN": codebuild.BuildEnvironmentVariable(value=fargate_task_def.task_role.role_arn),
                "EXECUTION_ROLE_ARN": codebuild.BuildEnvironmentVariable(value=fargate_task_def.execution_role.role_arn)
            }
        )

        # Grants CodeBuild project access to pull/push images from/to ECR repo
        image_repo.grant_pull_push(build_image)

        # Lambda function that triggers CodeBuild image build project
        trigger_code_build = lambda_.Function(
            self, "BuildLambda",
            architecture=lambda_.Architecture.ARM_64,
            code=lambda_.Code.from_asset("lambda"),
            handler="trigger-build.handler",
            runtime=lambda_.Runtime.NODEJS_18_X,
            environment={
                "CODEBUILD_PROJECT_NAME": build_image.project_name,
                "REGION": os.getenv('CDK_DEFAULT_REGION')
            },
            # Allows this Lambda function to trigger the buildImage CodeBuild project
            initial_policy=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["codebuild:StartBuild"],
                    resources=[build_image.project_arn]
                )
            ]
        )

        # Triggers a Lambda function using AWS SDK
        trigger_lambda = custom.AwsCustomResource(
            self, "BuildLambdaTrigger",
            install_latest_aws_sdk=True,
            policy=custom.AwsCustomResourcePolicy.from_statements([
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["lambda:InvokeFunction"],
                    resources=[trigger_code_build.function_arn],
                )
            ]),
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
            }
        )

        # Creates VPC for the ECS Cluster
        cluster_vpc = ec2.Vpc(
            self, "ClusterVpc",
            ip_addresses=ec2.IpAddresses.cidr(cidr_block="10.75.0.0/16")
        )

        # Deploys the cluster VPC after the initial image build triggers
        cluster_vpc.node.add_dependency(trigger_lambda)

        # Creates a new blue Target Group that routes traffic from the public Application Load Balancer (ALB) to the
        # registered targets within the Target Group e.g. (EC2 instances, IP addresses, Lambda functions)
        # https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
        target_group_blue = elb.ApplicationTargetGroup(
            self, "BlueTargetGroup",
            target_group_name="alb-blue-tg",
            target_type=elb.TargetType.IP,
            port=80,
            vpc=cluster_vpc
        )

        # Creates a new green Target Group
        target_group_green = elb.ApplicationTargetGroup(
            self, "GreenTargetGroup",
            target_group_name="alb-green-tg",
            target_type=elb.TargetType.IP,
            port=80,
            vpc=cluster_vpc
        )

        # Creates a Security Group for the Application Load Balancer (ALB)
        albSg = ec2.SecurityGroup(
            self, "AlbSecurityGroup",
            vpc=cluster_vpc,
            allow_all_outbound=True
        )
        albSg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(80),
            description="Allows access on port 80/http",
            remote_rule=False
        )

        # Creates a public ALB
        public_alb = elb.ApplicationLoadBalancer(
            self, "PublicAlb",
            vpc=cluster_vpc,
            internet_facing=True,
            security_group=albSg
        )

        # Adds a listener on port 80 to the ALB
        alb_listener = public_alb.add_listener(
            "AlbListener80",
            open=False,
            port=80,
            default_target_groups=[target_group_blue]
        )

        # Creates an ECS Fargate service
        fargate_service = ecs.FargateService(
            self, "FargateService",
            desired_count=1,
            service_name="fargate-frontend-service",
            task_definition=fargate_task_def,
            cluster=ecs.Cluster(
                self, "EcsCluster",
                enable_fargate_capacity_providers=True,
                vpc=cluster_vpc
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
                pipelineactions.CodeCommitSourceAction(
                    action_name="CodeCommit",
                    branch="main",
                    output=source_artifact,
                    repository=code_repo
                )
            ]
        )

        # Creates the build stage for CodePipeline
        build_stage = pipeline.StageProps(
            stage_name="Build",
            actions=[
                pipelineactions.CodeBuildAction(
                    action_name="DockerBuildPush",
                    input=pipeline.Artifact("SourceArtifact"),
                    project=build_image,
                    outputs=[build_artifact]
                )
            ]
        )

        # Creates a new CodeDeploy Deployment Group
        deployment_group = codedeploy.EcsDeploymentGroup(
            self, "CodeDeployGroup",
            service=fargate_service,
            # Configurations for CodeDeploy Blue/Green deployments
            blue_green_deployment_config=codedeploy.EcsBlueGreenDeploymentConfig(
                listener=alb_listener,
                blue_target_group=target_group_blue,
                green_target_group=target_group_green
            )
        )

        # Creates the deploy stage for CodePipeline
        deploy_stage = pipeline.StageProps(
            stage_name="Deploy",
            actions=[
                pipelineactions.CodeDeployEcsDeployAction(
                    action_name="EcsFargateDeploy",
                    app_spec_template_input=build_artifact,
                    task_definition_template_input=build_artifact,
                    deployment_group=deployment_group
                )
            ]
        )

        # Creates an AWS CodePipeline with source, build, and deploy stages
        pipeline.Pipeline(
            self, "BuildDeployPipeline",
            pipeline_name="ImageBuildDeployPipeline",
            stages=[source_stage, build_stage, deploy_stage]
        )

        # Outputs the ALB public endpoint
        CfnOutput(
            self, "PublicAlbEndpoint",
            value=f"http://{public_alb.load_balancer_dns_name}"
        )
