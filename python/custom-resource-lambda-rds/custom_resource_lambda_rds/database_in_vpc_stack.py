from aws_cdk import (
    core as cdk,
    aws_rds as rds,
    aws_ec2 as ec2,
)
from aws_cdk.aws_secretsmanager import ISecret


class DatabaseInVpcStack(cdk.Stack):

    def __init__(self, scope: cdk.Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        is_rds_publicly_accessible = (self.node.try_get_context(
            'rdsPubliclyAccessible') == 'true')

        rds_vpc = ec2.Vpc(
            self,
            'DatabaseVpc',
        )

        rds_security_group = ec2.SecurityGroup(
            self,
            'DatabaseSG',
            vpc=rds_vpc,
        )

        rds_access_security_group = ec2.SecurityGroup(
            self,
            'RdsAccessSG',
            vpc=rds_vpc,
        )

        rds_security_group.add_ingress_rule(
            rds_access_security_group,
            connection=ec2.Port.tcp(3306),
        )

        if is_rds_publicly_accessible:
            rds_subnet_selection = ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC)
        else:
            rds_subnet_selection = ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE)

        rds_database = rds.DatabaseInstance(
            self,
            'RdsDatabase',
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_5_7_34),
            vpc=rds_vpc,
            # Set removal policy to SNAPSHOT or RETAIN if you need to keep the database data
            removal_policy=cdk.RemovalPolicy.DESTROY,
            storage_encrypted=True,
            publicly_accessible=is_rds_publicly_accessible,
            security_groups=[rds_security_group],
            vpc_subnets=rds_subnet_selection,
        )

        self._rds_vpc = rds_vpc
        self._rds_access_security_group = rds_access_security_group
        self._rds_database_secret = rds_database.secret

    @property
    def rds_vpc(self) -> 'ec2.Vpc':
        return self._rds_vpc

    @property
    def rds_access_security_group(self) -> 'ec2.ISecurityGroup':
        return self._rds_access_security_group

    @property
    def rds_database_secret(self) -> ISecret:
        return self._rds_database_secret
