from aws_cdk import Stack, aws_iam as _iam, CfnOutput, PhysicalName
from cdk_nag import NagSuppressions
from constructs import Construct

from common import EnvSettings


class IamRoleAppAccountStack(Stack):
    IAM_CROSSACCOUNT_ROLE = ""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        account = EnvSettings.ACCOUNT
        tags = EnvSettings.TAGS['Project']
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
                                "iam:TagRole",
                                "iam:TagPolicy",
                                "iam:UntagRole",
                                "iam:UntagPolicy",
                            ],
                            resources=["*"],
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=["lambda:*"],
                            resources=["*"],
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=["s3:GetObject", "s3:PutObject"],
                            resources=["*"],
                            conditions={
                                "StringEquals": {
                                    "aws:PrincipalTag/Project": f"{tags}"
                                }
                            },
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=["cloudformation:*"],
                            resources=["*"],
                        ),
                        _iam.PolicyStatement(
                            effect=_iam.Effect.ALLOW,
                            actions=["iam:PassRole"],
                            resources=["*"],
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
