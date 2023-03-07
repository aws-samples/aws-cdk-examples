import os

from aws_cdk import (
    Stack,
    aws_codepipeline as _codepipeline,
    aws_codepipeline_actions as _codepipeline_actions,
    aws_codebuild as _codebuild
)
from cdk_nag import NagSuppressions
from constructs import Construct

from cdk.helpers import pipeline_common
from common import CodeArtifactSettings, EnvSettings


class UpStreamPipelineStack(Stack):
    def __init__(self, scope: Construct, construct_id: str,
                 codeartifact_domain_arn: str, **kwargs) -> None:
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
            directory_path=os.path.join(os.getcwd(), "demo-package"),
            repo_name=f"{construct_id}-CodeRepo",
        )

        source_output = pipeline_common.create_output_artifact()
        source_action = _codepipeline_actions.CodeCommitSourceAction(
            output=source_output,
            repository=codecommit_repo,
            action_name="CodeCommit",
            branch="main",
        )

        upstream_pipeline = _codepipeline.Pipeline(
            self,
            "UpstreamPipeline",
            artifact_bucket=pipeline_bucket,
            pipeline_name="UpstreamArtifactPipeline",
            cross_account_keys=True,
        )
        upstream_pipeline.add_stage(
            stage_name="SourceRepo",
            actions=[source_action]
            )
        codebuild_environment = pipeline_common.CODEBUILD_DEFAULT_ENV

        codebuild_spec = _codebuild.BuildSpec.from_source_filename(
            "./buildspecs/buildartifact.yaml"
        )

        codebuild_create_artifact = _codebuild.PipelineProject(
            self,
            "BuildArtifacts",
            environment=codebuild_environment,
            build_spec=codebuild_spec,
            encryption_key=pipeline_cmk,
        )

        codebuild_artifact_output = pipeline_common.create_output_artifact()
        codebuild_artifact_action = _codepipeline_actions.CodeBuildAction(
            action_name="BuildArtifact",
            project=codebuild_create_artifact,
            input=source_output,
            outputs=[codebuild_artifact_output],
        )

        upstream_pipeline.add_stage(
            stage_name="BuildArtifact",
            actions=[codebuild_artifact_action],
        )

        codebuild_publish_spec = _codebuild.BuildSpec.from_source_filename(
            "./buildspecs/publishartifact.yaml"
        )

        codebuild_push_artifact = _codebuild.PipelineProject(
            self,
            "PushArtifact",
            environment=codebuild_environment,
            build_spec=codebuild_publish_spec,
            encryption_key=pipeline_cmk,
            environment_variables={
                "DomainName": _codebuild.BuildEnvironmentVariable(
                    value=CodeArtifactSettings.DOMAIN
                ),
                "Repo": _codebuild.BuildEnvironmentVariable(
                    value=CodeArtifactSettings.REPO
                ),
                "Account": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.ACCOUNT
                ),
                "Region": _codebuild.BuildEnvironmentVariable(
                    value=EnvSettings.REGION_ARTIFACTS
                ),
            },
        )
        pipeline_common.update_role_with_codeartifact_policy(
            scope=self,
            construct_id=construct_id,
            iam_role=codebuild_push_artifact.role,
            codeartifact_domain_arn=codeartifact_domain_arn
        )

        codebuild_push_artifact_output = _codepipeline.Artifact()
        codebuild_push_artifact_action = _codepipeline_actions.CodeBuildAction(
            input=codebuild_artifact_output,
            outputs=[codebuild_push_artifact_output],
            action_name="PushArtifact",
            project=codebuild_push_artifact,
        )

        upstream_pipeline.add_stage(
            stage_name="PushArtifact", actions=[codebuild_push_artifact_action]
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
