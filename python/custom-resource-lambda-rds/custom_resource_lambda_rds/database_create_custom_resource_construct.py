from aws_cdk import (
    core as cdk,
    aws_ec2 as ec2,
    aws_lambda as _lambda,
    aws_lambda_python as _lambda_python,
    aws_iam as iam,
)

from aws_cdk.aws_secretsmanager import ISecret

from typing import List


class DatabaseCreate(cdk.Construct):
    def __init__(
            self,
            scope: cdk.Construct,
            id: str,
            rds_secret: ISecret,
            database_name: str,
            vpc: 'ec2.Vpc',
            subnets: List['ec2.ISubnet'],
            security_groups: List['ec2.ISecurityGroup'],
            is_verbose: bool = False,
            ** kwargs
    ) -> None:
        super().__init__(scope, id)

        custom_resource_lambda = _lambda_python.PythonFunction(
            self, 'DatabaseCreate',
            entry="./lambda",
            index="database_create.py",
            runtime=_lambda.Runtime.PYTHON_3_7,
            handler='lambda_handler',
            timeout=cdk.Duration.seconds(60),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnets=subnets
            ),
            security_groups=security_groups,
            environment={"VERBOSE": str(is_verbose)}
        )

        custom_resource_lambda.role.add_to_principal_policy(
            iam.PolicyStatement(
                resources=['*'],
                actions=[
                    "secretsmanager:ListSecrets"
                ]
            )
        )

        custom_resource_lambda.role.add_to_principal_policy(
            iam.PolicyStatement(
                resources=[rds_secret.secret_arn],
                actions=[
                    "secretsmanager:GetResourcePolicy",
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:ListSecretVersionIds",
                ]
            )
        )

        cdk.CustomResource(
            self,
            id,
            service_token=custom_resource_lambda.function_arn,
            properties={
                'DatabaseName': database_name,
                'RDSSecretName': rds_secret.secret_name,
            },
        )
