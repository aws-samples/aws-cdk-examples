import os

from aws_cdk import (
    Stack,
    aws_codepipeline as _codepipeline,
    aws_codepipeline_actions as _codepipeline_actions,
    aws_codebuild as _codebuild,
    aws_iam as _iam,
)
from cdk_nag import NagSuppressions
from constructs import Construct

from cdk.helpers import pipeline_common
from common import EnvSettings, CodeArtifactSettings


class DownStreamPipelineStack(Stack):
    def __init__(
        self, scope: Construct, construct_id: str, iam_role_app,
        codeartifact_domain_arn: str, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        pipeline_cmk = pipeline_common.create_encryption_key(
            scope=self, construct_id=construct_id
        )
        pipeline_bucket = pipeline_common.create_artifacts_bucket(
            scope=self, construct_id=construct_id, encryption_key=pipeline_cmk
        )

        codecommit_repo = pipeline_common.create_codecommit_repo(
            scope=self,
            construct_id=construct_id,
            directory_path=os.path.join(os.getcwd(), "lambda-test"),
            repo_name=f"{construct_id}-CodeRepo",
        )

        downstream_pipeline = _codepipeline.Pipeline(
            self,
            "DownstreamPipeline",
            cross_account_keys=True,
            pipeline_name="DownstreamArtifactPipeline",
            artifact_bucket=pipeline_bucket,
        )

        output_artifact = pipeline_common.create_output_artifact()

        source_action = _codepipeline_actions.CodeCommitSourceAction(
            repository=codecommit_repo,
            output=output_artifact,
            action_name="Source",
            branch="main",
        )

        downstream_pipeline.add_stage(
            stage_name="Source",
            actions=[source_action],
        )

        codebuild_environment = pipeline_common.CODEBUILD_DEFAULT_ENV

        package_codebuild_output = pipeline_common.create_output_artifact()

        package_lambda_codebuild_project = _codebuild.PipelineProject(
            self,
            "PackageLambda",
            build_spec=_codebuild.BuildSpec.from_source_filename(
                "./buildspecs/sambuild.yaml"
            ),
            environment=codebuild_environment,
            encryption_key=pipeline_cmk,
        )

        pipeline_common.update_role_with_codeartifact_policy(
            scope=self,
            construct_id=construct_id,
            iam_role=package_lambda_codebuild_project.role,
            codeartifact_domain_arn=codeartifact_domain_arn
        )

        package_codebuild_action = _codepipeline_actions.CodeBuildAction(
            input=output_artifact,
            outputs=[package_codebuild_output],
            project=package_lambda_codebuild_project,
            action_name="BuildLambdaAndCustomLayer",
            environment_variables={
                "SAM_TEMPLATE": _codebuild.BuildEnvironmentVariable(
                    value="template.yaml"
                ),
                "PIPELINE_EXECUTION_ROLE": _codebuild.BuildEnvironmentVariable(
                    value=downstream_pipeline.role
                ),
                "ARTIFACT_BUCKET": _codebuild.BuildEnvironmentVariable(
                    value=downstream_pipeline.artifact_bucket.bucket_name
                ),
                "REGION": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.REGION_MAIN
                ),
                "REGION_ARTIFACTS": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.REGION_ARTIFACTS
                ),
                "REPO": _codebuild.BuildEnvironmentVariable(
                    value=CodeArtifactSettings.REPO
                ),
                "ACCOUNT": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.ACCOUNT
                ),
                "DOMAIN": _codebuild.BuildEnvironmentVariable(
                    value=CodeArtifactSettings.DOMAIN
                ),
            },
        )

        downstream_pipeline.add_stage(
            stage_name="PackageLambda", actions=[package_codebuild_action]
        )

        deploy_lambda_codebuild_project = _codebuild.PipelineProject(
            self,
            "DeployLambda",
            build_spec=_codebuild.BuildSpec.from_source_filename(
                "./buildspecs/samdeploy.yaml"
            ),
            environment=codebuild_environment,
            encryption_key=pipeline_cmk,
        )

        deploy_lambda_codebuild_project.add_to_role_policy(
            statement=_iam.PolicyStatement(
                actions=["sts:AssumeRole"],
                resources=[iam_role_app],
                effect=_iam.Effect.ALLOW,
            )
        )

        deploy_codebuild_output = _codepipeline.Artifact()
        deploy_codebuild_action = _codepipeline_actions.CodeBuildAction(
            input=package_codebuild_output,
            outputs=[deploy_codebuild_output],
            project=deploy_lambda_codebuild_project,
            action_name="DeployLambda",
            environment_variables={
                "TEMPLATE": _codebuild.BuildEnvironmentVariable(
                    value="packaged-sam.yaml"
                ),
                "STACK_NAME": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.CFN_STACK_NAME_SAM_DEPLOY
                ),
                "REGION": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.REGION_MAIN
                ),
                "BUCKET": _codebuild.BuildEnvironmentVariable(
                    value=downstream_pipeline.artifact_bucket.bucket_name
                ),
                "CLOUDFORMATION_EXECUTION_ROLE":
                    _codebuild.BuildEnvironmentVariable(
                        value=iam_role_app
                ),
            },
        )
        downstream_pipeline.add_stage(
            stage_name="DeployLambda",
            actions=[deploy_codebuild_action],
        )

        NagSuppressions.add_stack_suppressions(
            self,
            suppressions=[
                {
                    "id": "AwsSolutions-S1",
                    "reason": "Demo - S3 Access Logs not required",
                },
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "Permission Required for Pipeline Role",
                },
                {
                    "id": "AwsSolutions-CB3",
                    "reason": "Priveldged mode required for CodeBuild Job to \
                        run sam build in a container",
                },
            ],
        )
