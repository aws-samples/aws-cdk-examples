from aws_cdk import (
    Stack, aws_iam as _iam,
    CfnOutput,
    PhysicalName,
    Aws,
    Arn,
    ArnComponents,
    ArnFormat
)

from cdk_nag import NagSuppressions
from constructs import Construct

from common import EnvSettings


class IamRoleAppAccountStack(Stack):
    IAM_CROSSACCOUNT_ROLE = ""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        account = EnvSettings.ACCOUNT
        tags = EnvSettings.TAGS['Project']
        s3_bucket = Arn.format(
            components=ArnComponents(
                partition=Aws.PARTITION,
                region=Aws.NO_VALUE,
                account=Aws.NO_VALUE,
                arn_format=ArnFormat.NO_RESOURCE_NAME,
                service="s3",
                resource=EnvSettings.PROJECT,
            )
        )
        s3_bucket_full = f"{s3_bucket}*/*"
        iam_cross_account_role = _iam.Role(
            self,
            "IamRoleCrossAccountCodeBuildAccess",
            role_name=PhysicalName.GENERATE_IF_NEEDED,
            assumed_by=_iam.AccountPrincipal(account).with_conditions(
                conditions={
                    "StringEquals": {
                        "aws:PrincipalTag/Project": f"{tags}"
                    }
                }
            ),
            inline_policies={
                "AllowLambdaDeployment": _iam.PolicyDocument(
                    statements=[
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=[
                                "iam:GetRole",
                                "iam:AttachRolePolicy",
                                "iam:CreateRole",
                                "iam:DeleteRole",
                                "iam:DeleteRolePolicy",
                                "iam:DetachRolePolicy",
                                "iam:UpdateRole",
                                "iam:UpdateRoleDescription",
                                "iam:TagRole",
                                "iam:TagPolicy",
                                "iam:UntagRole",
                                "iam:UntagPolicy",
                                "iam:PassRole"
                            ],
                            resources=["*"],
                            conditions={
                                "StringEquals": {
                                    "aws:PrincipalTag/Project": f"{tags}"
                                }
                            },
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=[
                                "lambda:AddLayerVersionPermission",
                                "lambda:CreateAlias",
                                "lambda:CreateFunction",
                                "lambda:DeleteAlias",
                                "lambda:DeleteFunction",
                                "lambda:DeleteLayerVersion",
                                "lambda:GetAlias",
                                "lambda:GetFunction",
                                "lambda:GetFunctionConfiguration",
                                "lambda:GetLayerVersion",
                                "lambda:GetLayerVersionPolicy",
                                "lambda:GetPolicy",
                                "lambda:ListLayers",
                                "lambda:ListLayerVersions",
                                "lambda:ListTags",
                                "lambda:ListVersionsByFunction",
                                "lambda:PublishLayer",
                                "lambda:PublishLayerVersion",
                                "lambda:PublishVersion",
                                "lambda:PutRuntimeManagementConfig",
                                "lambda:RemoveLayerVersionPermission",
                                "lambda:TagResource",
                                "lambda:UntagResource",
                                "lambda:UpdateFunctionCode",
                                "lambda:UpdateFunctionConfiguration"
                                ],
                            resources=["*"],
                            conditions={
                                "StringEquals": {
                                    "aws:PrincipalTag/Project": f"{tags}"
                                }
                            },
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=["s3:GetObject", "s3:PutObject"],
                            resources=[s3_bucket_full],
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=[
                                "cloudformation:CreateChangeSet",
                                "cloudformation:CreateStack",
                                "cloudformation:DeleteChangeSet",
                                "cloudformation:DeleteStack",
                                "cloudformation:DescribeChangeSet",
                                "cloudformation:DescribeStackEvents",
                                "cloudformation:DescribeStackResource",
                                "cloudformation:DescribeStackResourceDrifts",
                                "cloudformation:DescribeStackSet",
                                "cloudformation:DescribeStackSetOperation",
                                "cloudformation:DescribeStacks",
                                "cloudformation:ExecuteChangeSet",
                                "cloudformation:UpdateStackSet",
                                "cloudformation:ValidateTemplate",
                                "cloudformation:GetTemplateSummary"
                                ],
                            resources=["*"],
                            conditions={
                                "StringEquals": {
                                    "aws:PrincipalTag/Project": f"{tags}"
                                }
                            },
                        ),
                    ]
                )
            },
        )
        self.IAM_CROSSACCOUNT_ROLE = CfnOutput(
            self, "IamRoleAppAccount", value=iam_cross_account_role.role_arn
        ).value
        NagSuppressions.add_stack_suppressions(
            self,
            suppressions=[
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "Required for SAM deploy running inside \
                        codebuild",
                }
            ],
        )
