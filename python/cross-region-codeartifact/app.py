#!/usr/bin/env python3
import aws_cdk as cdk
import cdk_nag

from cdk.stacks.code_artifact import CodeArtifactCrossRegionStack
from cdk.stacks.downstream_pipeline import DownStreamPipelineStack
from cdk.stacks.iam_role_app_account import IamRoleAppAccountStack
from cdk.stacks.upstream_pipeline import UpStreamPipelineStack
from cdk_env import CDKEnvBuilder
from common import (
    EnvSettings,
    CodeArtifactSettings
)

app = cdk.App()

project = EnvSettings.PROJECT
codeartifact_domain = CodeArtifactSettings.DOMAIN
codeartifact_repo = CodeArtifactSettings.REPO

# instaniate stacks

iam_stack = IamRoleAppAccountStack(
    scope=app,
    construct_id="crossaccount-role",
    stack_name=f"{project}-crossaccount-iam-role",
    env=CDKEnvBuilder.find_env("crossaccount-role")
)

codeartifact_stack = CodeArtifactCrossRegionStack(
    scope=app,
    construct_id="codeartifact",
    stack_name=f"{project}-{codeartifact_domain}-{codeartifact_repo}",
    env=CDKEnvBuilder.find_env("codeartifact")
)

us_stack = UpStreamPipelineStack(
    scope=app,
    construct_id="upstream-pipeline",
    stack_name=f"{project}-UpstreamPipeline",
    env=CDKEnvBuilder.find_env("upstream-pipeline")
)
us_stack.add_dependency(target=codeartifact_stack,
                        reason='CodeArtifact Repo needs to be created and run \
                                first before UpstreamPipeline can run')
crossaccount_role = iam_stack.IAM_CROSSACCOUNT_ROLE
if crossaccount_role:
    ds_stack = DownStreamPipelineStack(
        scope=app,
        construct_id="downstream-pipeline",
        stack_name=f"{project}-DownstreamPipeline",
        iam_role_app=crossaccount_role,
        env=CDKEnvBuilder.find_env("downstream-pipeline")
    )
    ds_stack.add_dependency(target=us_stack,
                            reason='UpstreamPipeline needs to be created and \
                                    run first before DownstreamPipeline')
else:
    raise RuntimeError(
        """ Downstream Pipeline depends on crossaccount-role
            and upstream-pipeline stacks being created first
            Please run:
            cdk deploy --profile {aws_profile} crossaccount-role
            Followed by:
            cdk deploy --profile {aws_profile} downstream-pipeline
        """
    )

# adding cdk nag checks
cdk.Aspects.of(app).add(cdk_nag.AwsSolutionsChecks(verbose=True))

# Tag all resources within app
for k, v in EnvSettings.TAGS.items():
    cdk.Tags.of(app).add(k, v)

app.synth()
