# write a boilerplate class for an appmesh mesh with cdk
# from aws_cdk import (
#     aws_appmesh as appmesh,
    
# )
# import os
# import aws_cdk as core
# from aws_cdk import Stack, Tags, App
from constructs import Construct
# import aws_cdk.aws_ecs as ecs
# import aws_cdk.aws_servicediscovery as servicediscovery
# import aws_cdk.aws_elasticloadbalancingv2 as elbv2
# import aws_cdk.aws_ec2 as ec2
# import aws_cdk.aws_ecr as ecr
# from aws_cdk.aws_ecr_assets import DockerImageAsset, Platform
# import subprocess
from aws_cdk.aws_ecr_assets import DockerImageAsset, Platform
import cdk_ecr_deployment as ecrdeploy

from aws_cdk import (
    # Duration,
    NestedStack,
    Stack,
    aws_ec2 as ec2,
    aws_ecr as ecr,
    aws_ecs as ecs,
    Aws
    # aws_sqs as sqs,
)
class EcrStack(NestedStack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        # Creates two ecr repositories that will host the docker images for the color teller gateway app and color teller app
        FrontendRepository = ecr.Repository(self, "FrontendRepository", repository_name="frontend")
        BackendDataRepository = ecr.Repository(self, "BackendDataRepository", repository_name="backend_data")

        # The docker images were built on a M1 Macbook Pro, you may have to rebuild your images
        frontendAsset = DockerImageAsset(self, "frontendAsset",
            directory="./services/frontend",
            build_args={
                "SERVICE_B_URL_BUILD_ARG": "data.scapp.local" # This argument will be passed to the dockerfile and is the URL that the frontend app will use to call the backend
            },
            
            platform=Platform.LINUX_AMD64
        )
        dataAsset = DockerImageAsset(self, "dataAsset",
            directory="./services/data",

        )
        # Deploying images to ECR
        ecrdeploy.ECRDeployment(self, "DeployFrontendImage",
            src=ecrdeploy.DockerImageName(frontendAsset.image_uri),
            dest=ecrdeploy.DockerImageName(f"{Aws.ACCOUNT_ID}.dkr.ecr.{Aws.REGION}.amazonaws.com/frontend:latest")
        )

       

        ecrdeploy.ECRDeployment(self, "DeployBackendImage",
            src=ecrdeploy.DockerImageName(dataAsset.image_uri),
            dest=ecrdeploy.DockerImageName(f"{Aws.ACCOUNT_ID}.dkr.ecr.{Aws.REGION}.amazonaws.com/backend_data:latest")
        )

        # Exporting values to be used in other stacks
        self.frontend_docker_asset = frontendAsset
        self.backend_data_docker_asset = dataAsset
        self.frontend_repo = FrontendRepository
        self.backend_repo = BackendDataRepository
        self.frontend_repository_uri = FrontendRepository.repository_uri
        self.frontend_repository_name = FrontendRepository.repository_name
        self.backend_data_repository_uri = BackendDataRepository.repository_uri
        self.backend_data_repository_name = BackendDataRepository.repository_name