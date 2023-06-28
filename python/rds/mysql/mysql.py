#!/usr/bin/env python3

from aws_cdk import (
    aws_ec2 as ec2,
    aws_rds as rds,
    Fn, App, RemovalPolicy, Stack
)

from constructs import Construct

class MySql(Stack):
    def __init__(self, scope:Construct, id:str,
                vpc_id:str,                 ## vpc id
                subnet_ids:list,            ## list of subnet ids
                db_name:str,                ## database name
                instance_type = None,       ## ec2.InstanceType
                engine_version = None,      ## MySQL Engine Version
                **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        azs = Fn.get_azs()

        vpc = ec2.Vpc.from_vpc_attributes(self, 'ExistingVPC', availability_zones=azs, vpc_id=vpc_id)
        subnets = list()
        for subnet_id in subnet_ids:
          subnets.append(ec2.Subnet.from_subnet_attributes(self, subnet_id.replace("-", "").replace("_", "").replace(" ", ""), subnet_id=subnet_id))

        vpc_subnets = ec2.SubnetSelection(subnets=subnets)


        ##
        ## Default Instance Type
        ##
        if not instance_type:
            instance_type = ec2.InstanceType.of(ec2.InstanceClass.MEMORY4, ec2.InstanceSize.LARGE)

        ##
        ## Default Engine version
        ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/MysqlEngineVersion.html
        ##
        if not engine_version:
            engine_version = rds.MysqlEngineVersion.VER_8_0_28

        ##
        ## MySQL Instance
        ##
        rds.DatabaseInstance(self, "MySqlInstance",
            database_name=db_name,
            engine=rds.DatabaseInstanceEngine.mysql(version=engine_version),
            instance_type=instance_type,
            vpc_subnets=vpc_subnets,
            vpc=vpc,
            port=3306,
            removal_policy=RemovalPolicy.DESTROY,
            deletion_protection=False
        )


app = App()
MySql(app, "MySql", env={"region":"us-east-1"}, description="MySQL Instance Stack",
    vpc_id    = "vpc-aaaaaaaa",
    subnet_ids=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
    db_name="db1")
app.synth()
