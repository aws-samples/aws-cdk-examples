# write a boilerplate class for an appmesh mesh with cdk
from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import aws_cdk as core
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_servicediscovery as servicediscovery
import aws_cdk.aws_elasticloadbalancingv2 as elbv2
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_ecr as ecr
import subprocess
class ECRStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        # Creates two ecr repositories that will host the docker images for the color teller gateway app and color teller app
        ColorAppGatewayRepository = ecr.CfnRepository(
            self, "gateway",
            repository_name="gateway", 
            tags=[{
                "key": "Name",
                "value": "gateway"
            }]
        )
        ColorAppColorTellerRepository = ecr.CfnRepository(
            self, "colorteller",
            repository_name="colorteller", 
            tags=[{
                "key": "Name",
                "value": "colorteller"
            }]
        )

        core.CfnOutput(
            self, "ColorAppGatewayRepository",
            value=ColorAppGatewayRepository.attr_repository_uri,
            description="ColorAppRepository",
            export_name=f"{environment_name}:ColorAppRepository"
        )
        core.CfnOutput(
            self, "ColorAppColorTellerRepository",
            value=ColorAppColorTellerRepository.attr_repository_uri,
            description="ColorAppColorTellerRepository",
            export_name=f"{environment_name}:ColorAppColorTellerRepository"
        )

        