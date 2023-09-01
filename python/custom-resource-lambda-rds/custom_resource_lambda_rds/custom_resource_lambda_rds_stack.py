from typing import List
from aws_cdk import (
    core as cdk,
    aws_ec2 as ec2,
)
from aws_cdk.aws_secretsmanager import ISecret

from custom_resource_lambda_rds.database_create_custom_resource_construct import DatabaseCreate


class DatabaseWithCdkCustomResourceStack(cdk.Stack):

    def __init__(self,
                 scope: cdk.Construct,
                 construct_id: str,
                 database_name: str,
                 vpc: 'ec2.Vpc',
                 security_groups: List['ec2.ISecurityGroup'],
                 database_secret: ISecret,
                 **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        is_verbose = (self.node.try_get_context('verbose') == 'true')

        DatabaseCreate(
            self,
            'CustomDatabaseCreation',
            rds_secret=database_secret,
            database_name=database_name,
            vpc=vpc,
            subnets=vpc.private_subnets,
            security_groups=security_groups,
            is_verbose=is_verbose
        )
