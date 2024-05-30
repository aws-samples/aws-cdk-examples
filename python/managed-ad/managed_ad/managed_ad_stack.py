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
    custom_resources as cr,
)
from constructs import Construct
from cdk_nag import NagSuppressions
import json
import secrets
import string


class ManagedAdStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        initial_password = self.node.try_get_context("initial_password")
        if initial_password is None:
            characters = string.ascii_letters + string.digits + string.punctuation
            initial_password = "".join(secrets.choice(characters) for i in range(16))
            # update the context value in cdk.json with initial_password
            with open("cdk.json", "r", encoding="utf-8") as f:
                data = json.load(f)

            with open("cdk.json", "w", encoding="utf-8") as f:
                data["context"]["initial_password"] = initial_password
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
            vpc.add_flow_log(
                "VPCFlowLog",
                destination=ec2.FlowLogDestination.to_cloud_watch_logs(),
                traffic_type=ec2.FlowLogTrafficType.ALL,
            )
            if not internet_access:
                endpoint_sg = ec2.SecurityGroup(
                    self,
                    "EndpointSG",
                    vpc=vpc,
                    description="Security Group for VPC Interface Endpoints",
                    allow_all_outbound=False,
                )
                NagSuppressions.add_resource_suppressions_by_path(
                    self,
                    f"{self.stack_name}/EndpointSG/Resource",
                    [
                        {
                            "id": "CdkNagValidationFailure",
                            "reason": "AwsSolutions-EC23 errors on endpoint security groups.",
                        }
                    ],
                    True,
                )
                endpoint_sg.add_ingress_rule(
                    peer=ec2.Peer.ipv4(vpc.vpc_cidr_block), connection=ec2.Port.tcp(443)
                )
                vpc.add_interface_endpoint(
                    "SSMEndpoint",
                    service=ec2.InterfaceVpcEndpointAwsService.SSM,
                    private_dns_enabled=True,
                    security_groups=[endpoint_sg],
                )
                vpc.add_interface_endpoint(
                    "EC2MessagesEndpoint",
                    service=ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
                    private_dns_enabled=True,
                    security_groups=[endpoint_sg],
                )
                vpc.add_interface_endpoint(
                    "SSMMessagesEndpoint",
                    service=ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
                    private_dns_enabled=True,
                    security_groups=[endpoint_sg],
                )
        else:
            vpc = ec2.Vpc.from_lookup(self, id=vpc_id)

        ad_password_secret = secretsmanager.Secret(
            self, "ADPasswordSecret", secret_name="ad-password"
        )  # nosec B106 #Password is dynamically generated and stored securely.

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

        # Create lambda layer from ldap3_layer.zip
        ldap3_layer = lambda_.LayerVersion(
            self,
            "Ldap3Layer",
            code=lambda_.Code.from_asset("ldap3_layer/ldap3_layer.zip"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            compatible_architectures=[
                lambda_.Architecture.X86_64,
                lambda_.Architecture.ARM_64,
            ],
        )

        password_rotator_lambda = lambda_.Function(
            self,
            "PasswordRotatorLambda",
            code=lambda_.Code.from_asset("password_rotator_lambda"),
            handler="lambda_function.lambda_handler",
            runtime=lambda_.Runtime.PYTHON_3_12,
            role=iam.Role(
                self,
                "PasswordRotatorLambdaRole",
                assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            ),
            timeout=Duration.seconds(60),
            environment={"DIRECTORY_ID": managed_ad.ref},
        )

        password_rotator_lambda.add_layers(ldap3_layer)

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
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                effect=iam.Effect.ALLOW,
                resources=["*"],
            ),
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"{self.stack_name}/PasswordRotatorLambdaRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "Wildcard resource reference is required for the referenced logs and secretsmanager actions.",
                }
            ],
            True,
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

        ad_password_secret.add_rotation_schedule(
            id="ADPasswordSecretRotationSchedule",
            automatically_after=Duration.days(30),
            rotate_immediately_on_update=True,
            rotation_lambda=password_rotator_lambda,
        )

        CfnOutput(
            self,
            "ADPasswordSecretArn",
            value=ad_password_secret.secret_full_arn,
        )
