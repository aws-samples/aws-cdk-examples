#!/usr/bin/env python3

from aws_cdk import core as cdk

from custom_resource_lambda_rds.custom_resource_lambda_rds_stack import DatabaseWithCdkCustomResourceStack
from custom_resource_lambda_rds.database_in_vpc_stack import DatabaseInVpcStack


app = cdk.App()

custom_database_name = app.node.try_get_context('databaseName')

database = DatabaseInVpcStack(app, "DatabaseInVpcStack")

DatabaseWithCdkCustomResourceStack(
    app, "DatabaseWithCdkCustomResourceStack",
    database_name=custom_database_name,
    vpc=database.rds_vpc,
    security_groups=[database.rds_access_security_group],
    database_secret=database.rds_database_secret
)

app.synth()
