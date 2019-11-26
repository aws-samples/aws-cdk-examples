#!/usr/bin/env python3

from aws_cdk import (
    aws_ec2 as ec2,
    aws_rds as rds,
    core,
)


class RDSStack(core.Stack):
    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        vpc = ec2.Vpc(self, "VPC")
        
        rds.DatabaseInstance(
            self, "RDS",
            master_username="master",
            master_user_password=core.SecretValue.plain_text("password"),
            database_name="db1",
            engine_version="8.0.16",
            engine=rds.DatabaseInstanceEngine.MYSQL,
            vpc=vpc,
            port=3306,
            instance_class=ec2.InstanceType.of(
                ec2.InstanceClass.MEMORY4, 
                ec2.InstanceSize.LARGE,
            ),
            removal_policy=core.RemovalPolicy.DESTROY,
            deletion_protection=False
        ),


app = core.App()
RDSStack(app, "RDSStack")
app.synth()
