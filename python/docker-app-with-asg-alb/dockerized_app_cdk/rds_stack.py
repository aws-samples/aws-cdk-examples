from aws_cdk import (
    aws_rds as rds,
    aws_ec2 as ec2,
    core
    )


class RDSStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, props, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Creates a security group for AWS RDS
        sg_rds = ec2.SecurityGroup(
                self,
                id="sg_rds",
                vpc=props['vpc'],
                security_group_name="sg_rds"
        )

        # Adds an ingress rule which allows resources in the VPC's CIDR
        # to access the database.
        sg_rds.add_ingress_rule(
            peer=ec2.Peer.ipv4("10.0.0.0/16"),
            connection=ec2.Port.tcp(3306)
        )

        # Master username is 'admin' and database password is automatically
        # generated and stored in AWS Secrets Manager
        my_sql = rds.DatabaseInstance(
                self, "RDS",
                engine=rds.DatabaseInstanceEngine.mysql(
                    version=rds.MysqlEngineVersion.VER_8_0_16
                ),
                vpc=props['vpc'],
                port=3306,
                instance_type=ec2.InstanceType.of(
                    ec2.InstanceClass.MEMORY4,
                    ec2.InstanceSize.LARGE,
                    ),
                removal_policy=core.RemovalPolicy.DESTROY,
                security_groups=[sg_rds]
                )
