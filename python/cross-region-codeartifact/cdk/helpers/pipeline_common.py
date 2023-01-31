from aws_cdk import (
    CfnOutput,
    RemovalPolicy,
    PhysicalName,
    aws_s3 as _s3,
    aws_iam as _iam,
    aws_kms as _kms,
    aws_codecommit as _codecommit,
    aws_codepipeline as _codepipeline,
    aws_codebuild as _codebuild,
)
from constructs import Construct

from common import EnvSettings

CODEBUILD_DEFAULT_ENV = _codebuild.BuildEnvironment(
    build_image=_codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
    compute_type=_codebuild.ComputeType.SMALL,
    privileged=True,
)


def create_artifacts_bucket(
        scope: Construct,
        construct_id: str,
        encryption_key: _kms.IKey):
    # S3 bucket to store the pipeline artifacts
    artifacts_bucket = _s3.Bucket(
        scope,
        id=f"{EnvSettings.PROJECT}-artifacts-bucket",
        bucket_name=PhysicalName.GENERATE_IF_NEEDED,
        block_public_access=_s3.BlockPublicAccess.BLOCK_ALL,
        enforce_ssl=True,
        encryption=_s3.BucketEncryption.KMS,
        encryption_key=encryption_key,
        auto_delete_objects=True,
        removal_policy=RemovalPolicy.DESTROY,
    )

    if construct_id == "downstream-pipeline":
        artifacts_bucket.grant_read_write(
            _iam.AccountPrincipal(EnvSettings.APP_ACCOUNT)
        )

    CfnOutput(
        scope,
        f"ArtifactsBucket-{EnvSettings.PROJECT}",
        value=artifacts_bucket.bucket_name,
    )

    return artifacts_bucket


def create_encryption_key(scope: Construct, construct_id: str):
    encryption_key = _kms.Key(
        scope,
        id=f"{EnvSettings.PROJECT}-EncryptionKey-{construct_id}",
        removal_policy=RemovalPolicy.DESTROY,
        alias=f"{construct_id}-encryption-key",
        enable_key_rotation=True,
    )
    if construct_id == "downstream-pipeline":
        encryption_key.grant_encrypt_decrypt(
            grantee=_iam.AccountPrincipal(EnvSettings.APP_ACCOUNT)
        )

    CfnOutput(
        scope,
        f"EncryptionKey-{EnvSettings.PROJECT}-Arn",
        value=encryption_key.key_arn,
    )

    return encryption_key


def create_codecommit_repo(
    scope: Construct, construct_id: str, directory_path: str, repo_name: str
):
    codecommit_repo = _codecommit.Repository(
        scope,
        f"{construct_id}-CodeRepo",
        code=_codecommit.Code.from_directory(directory_path=directory_path),
        repository_name=repo_name,
    )
    return codecommit_repo


def create_output_artifact():
    return _codepipeline.Artifact()


def update_role_with_codeartifact_policy(
    scope: Construct, construct_id: str, iam_role: _iam.Role
):
    iam_policy = _iam.Policy(
        scope,
        f"codebuild-push-artifact-policy-{construct_id}",
        statements=[
            _iam.PolicyStatement(
                effect=_iam.Effect.ALLOW,
                resources=["*"],
                actions=[
                    "codeartifact:GetAuthorizationToken",
                    "codeartifact:GetRepositoryEndpoint",
                    "codeartifact:ReadFromRepository",
                ],
            ),
            _iam.PolicyStatement(
                effect=_iam.Effect.ALLOW,
                resources=["*"],
                actions=["sts:GetServiceBearerToken"],
                conditions={
                    "StringEquals": {
                        "sts:AWSServiceName": "codeartifact.amazonaws.com"
                        }
                },
            ),
        ],
        roles=[iam_role],
    )
    return iam_policy
