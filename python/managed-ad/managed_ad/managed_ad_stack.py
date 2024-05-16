from aws_cdk import (
    Aws,
    CfnOutput,
    Stack,
    Duration,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_directoryservice as ds,
    aws_secretsmanager as secretsmanager,
    aws_lambda as lambda_,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    custom_resources as cr
)
from constructs import Construct
import json
import secrets
import string


class ManagedAdStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        initial_password = self.node.try_get_context("initial_password")
        if initial_password is None:
            characters = string.ascii_letters + string.digits + string.punctuation
            initial_password = ''.join(secrets.choice(characters) for i in range(16))
            # update the context value in cdk.json with initial_password
            with open('cdk.json', 'r') as f:
                data = json.load(f)

            with open('cdk.json', 'w') as f:
                data['context']['initial_password'] = initial_password
                json.dump(data, f, indent=4)

        vpc_id = self.node.try_get_context("vpc_id")
        internet_access = self.node.try_get_context("internet_access")

        if vpc_id is None:
            if internet_access:
                subnet_configuration = [
                    ec2.SubnetConfiguration(
                        name="Public",
                        subnet_type=ec2.SubnetType.PUBLIC,
                    ),
                    ec2.SubnetConfiguration(
                        name="Private",
                        subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    ),
                ]
            else:
                subnet_configuration = [
                    ec2.SubnetConfiguration(
                        name="Private",
                        subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    ),
                ]
            vpc = ec2.Vpc(
                self,
                "ManagedAdVPC",
                max_azs=2,
                create_internet_gateway=self.node.try_get_context("internet_access"),
                subnet_configuration=subnet_configuration,
            )
        else:
            vpc = ec2.Vpc.from_lookup(self, id=vpc_id)

        ad_password_secret = secretsmanager.Secret(
            self,
            "ADPasswordSecret",
            secret_name="ad-password",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"password": ""}',
                generate_string_key="password"
            )
        )

        CfnOutput(
            self,
            "ADPasswordSecretArn",
            value=ad_password_secret.secret_full_arn,
        )

        # Check if there are any private subnets available
        if vpc.private_subnets:
            subnet_ids = [
                vpc.private_subnets[0].subnet_id,
                vpc.private_subnets[1].subnet_id,
            ]
        else:
            subnet_ids = [
                vpc.isolated_subnets[0].subnet_id,
                vpc.isolated_subnets[1].subnet_id,
            ]

        managed_ad = ds.CfnMicrosoftAD(
            self,
            "ManagedAD",
            name=self.node.try_get_context("ad_domain_name"),
            vpc_settings=ds.CfnMicrosoftAD.VpcSettingsProperty(
                subnet_ids=subnet_ids,
                vpc_id=vpc.vpc_id,
            ),
            password=initial_password,
            edition=self.node.try_get_context("ad_edition"),
        )

        password_rotator_lambda = lambda_.Function(
            self,
            "PasswordRotatorLambda",
            code=lambda_.Code.from_asset("password_rotator_lambda"),
            handler="password_rotator.rotate_ad_password",
            runtime=lambda_.Runtime.PYTHON_3_12,
            environment={
                "DIRECTORY_ID": managed_ad.ref,
                "SECRETS_MANAGER_ARN": ad_password_secret.secret_arn,
            },
        )

        password_rotator_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:PutSecretValue",
                ],
                effect=iam.Effect.ALLOW,
                resources=[ad_password_secret.secret_arn],
            )
        )

        password_rotator_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "secretsmanager:GetRandomPassword",
                ],
                effect=iam.Effect.ALLOW,
                resources=["*"],
            ),
        )

        password_rotator_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ds:DescribeDirectories", "ds:ResetUserPassword"],
                effect=iam.Effect.ALLOW,
                resources=[
                    self.format_arn(
                        resource="directory",
                        service="ds",
                        resource_name=managed_ad.ref,
                    )
                ],
            ),
        )

        initial_password_rotation = cr.AwsCustomResource(
            self,
            "InitialPasswordRotation",
            on_create=cr.AwsSdkCall(
                service="Lambda",
                action="invoke",
                parameters={
                    "FunctionName": password_rotator_lambda.function_name,
                },
                physical_resource_id=cr.PhysicalResourceId.of(
                    "InitialPasswordRotation"
                ),
            ),
            policy=cr.AwsCustomResourcePolicy.from_statements(
                statements=[
                    iam.PolicyStatement(
                        actions=["lambda:InvokeFunction"],
                        effect=iam.Effect.ALLOW,
                        resources=[password_rotator_lambda.function_arn],
                    )
                ]
            ),
            resource_type="Custom::InitialPasswordRotation",
            timeout=Duration.minutes(15),
        )

        initial_password_rotation.node.add_dependency(managed_ad)

        password_rotation_rule = events.Rule(
            self,
            "PasswordRotationRule",
            schedule=events.Schedule.rate(Duration.days(30)),
        )

        password_rotation_rule.add_target(
            targets.LambdaFunction(password_rotator_lambda)
        )
