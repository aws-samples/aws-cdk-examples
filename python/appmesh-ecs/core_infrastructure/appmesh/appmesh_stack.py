# write a boilerplate class for an appmesh mesh with cdk
from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import aws_cdk as core
from aws_cdk import Stack, Tags, App
from constructs import Construct
class AppMeshStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        # Creates an AWS App Mesh mesh
        mesh = appmesh.Mesh(self, "ecs-mesh", mesh_name=environment_name) 
         
        core.CfnOutput(
            self, "MeshName",
            value=mesh.mesh_name,
            description="A reference to the AppMesh Meshs",
            export_name=f"{environment_name}:Mesh"
        )
