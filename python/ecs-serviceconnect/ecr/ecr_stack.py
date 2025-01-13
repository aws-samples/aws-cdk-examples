from constructs import Construct
from aws_cdk.aws_ecr_assets import DockerImageAsset, Platform
import cdk_ecr_deployment as ecrdeploy

from aws_cdk import (
    NestedStack,
    aws_ecr as ecr,
    Aws
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