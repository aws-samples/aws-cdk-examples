import aws_cdk as cdk
from aws_cdk import (
    aws_lambda as lambda_,
    aws_iam    as iam,
    App, Duration, Stack
)
import cdk_nag as nag

class LambdaNagExampleStack(Stack):
    def __init__(self, app: App, id: str) -> None:
        super().__init__(app, id)

        # Building Role
        lambda_func_role = iam.Role(self, "lambda-nag-func-role-example",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="A simple role detached from self CDK built role"
        )
        lambda_func_role_policy = iam.Policy(
            self, "lambda-nag-func-role-policy-example",
            statements=[
                iam.PolicyStatement(
                    actions=[
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                            "logs:CreateLogGroup"
                    ],
                    resources=[
                        "*"
                    ]
                )
            ],
            roles=[lambda_func_role]
        )

        # In case of wildcard policy usage you must add a suppression in order to give a reason for that.
        nag.NagSuppressions.add_resource_suppressions(
            lambda_func_role_policy,
            [{
                "id": "AwsSolutions-IAM5",
                "reason": "A wildcard is necessary over this policy because <put your reason here>..."
            }]
        )

        with open("lambda-func/lambda-handler.py", encoding="utf8") as fcn_file:
            handler_code = fcn_file.read()

        # A non-container Lambda function is not configured to use the latest runtime version can raise a new error
        lambda_func = lambda_.Function(
            self, "lambda-nag-func-example",
            code=lambda_.InlineCode(handler_code),
            handler="index.handler",
            timeout=Duration.seconds(30),
            role=lambda_func_role,
            runtime=lambda_.Runtime.PYTHON_3_10,
        )

app = App()
LambdaNagExampleStack(app, "LambdaNagExampleStack")
cdk.Aspects.of(app).add(nag.AwsSolutionsChecks(verbose=True))
app.synth()
