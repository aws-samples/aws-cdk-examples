# write a boilerplate class for an appmesh mesh with cdk
from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import os
import aws_cdk as core
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_servicediscovery as servicediscovery
import aws_cdk.aws_elasticloadbalancingv2 as elbv2
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_ecr as ecr
from aws_cdk.aws_ecr_assets import DockerImageAsset, Platform
import cdk_ecr_deployment as ecrdeploy
import subprocess
class ECRStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        # Creates two ecr repositories that will host the docker images for the color teller gateway app and color teller app
        ColorAppGatewayRepository = ecr.Repository(self, "GatewayRepository", repository_name="gateway")
        ColorAppColorTellerRepository = ecr.Repository(self, "ColorTellerRepository", repository_name="colorteller")

        # The docker images were built on a M1 Macbook Pro, you may have to rebuild your images
        gatewayAsset = DockerImageAsset(self, "gatewayAsset",
            directory="./container_images/gateway",
            build_args={
                "GOPROXY": 'direct'
            },
            platform=Platform.LINUX_AMD64
        )
        colortellerAsset = DockerImageAsset(self, "colortellerAsset",
            directory="./container_images/colorteller",
             build_args={
                "GOPROXY": 'direct'
            }
            

        )

        ecrdeploy.ECRDeployment(self, "DeployGatewayImage",
            src=ecrdeploy.DockerImageName(gatewayAsset.image_uri),
            dest=ecrdeploy.DockerImageName(f"{core.Aws.ACCOUNT_ID}.dkr.ecr.{core.Aws.REGION}.amazonaws.com/gateway:latest")
        )

       

        ecrdeploy.ECRDeployment(self, "DeployColorTellerImage",
            src=ecrdeploy.DockerImageName(colortellerAsset.image_uri),
            dest=ecrdeploy.DockerImageName(f"{core.Aws.ACCOUNT_ID}.dkr.ecr.{core.Aws.REGION}.amazonaws.com/colorteller:latest")
        )
        core.CfnOutput(
            self, "ColorAppGatewayRepository",
            value=ColorAppGatewayRepository.repository_uri,
            description="ColorAppRepository",
            export_name=f"{environment_name}:ColorAppRepository"
        )
        core.CfnOutput(
            self, "ColorAppGatewayRepositoryName",
            value=ColorAppGatewayRepository.repository_name,
            description="ColorAppGatewayRepository",
            export_name=f"{environment_name}:ColorAppGatewayRepository"
        )
        core.CfnOutput(
            self, "ColorAppColorTellerRepository",
            value=ColorAppColorTellerRepository.repository_uri,
            description="ColorAppColorTellerRepository",
            export_name=f"{environment_name}:ColorAppColorTellerRepository"
        )
        core.CfnOutput(
            self, "ColorAppColorTellerRepositoryName",
            value=ColorAppColorTellerRepository.repository_name,
            description="ColorAppColorTellerRepository",
            export_name=f"{environment_name}:ColorAppColorTellerRepositoryName"
        )
        
