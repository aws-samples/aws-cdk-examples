#!/usr/bin/env python3
import os

import aws_cdk as cdk
from core_infrastructure.ecs.ecs_stack import ECSStack
from core_infrastructure.appmesh.appmesh_stack import AppMeshStack 
from core_infrastructure.ecr.ecr_stack import ECRStack
from task_definitions.color_app_task_definition_stack import ColorAppTaskDefinitionStack
from colorapp.appmesh_colorapp import ServiceMeshColorAppStack

app = cdk.App()
ecs_stack = ECSStack(app, "ECSClusterStack")
appmesh_stack = AppMeshStack(app, "AppMeshStack")
ecr_stack = ECRStack(app, "ECRStack")
appmesh_colorapp_stack = ServiceMeshColorAppStack(app, "AppmeshColorappStack")
colorapp_task_definition_stack = ColorAppTaskDefinitionStack(app, "ColorAppTaskDefinitionStack",env={
    # Uncomment these when you deploy

    "account": os.environ["CDK_DEFAULT_ACCOUNT"], 
    "region": os.environ["CDK_DEFAULT_REGION"]
})

appmesh_stack.add_dependency(ecs_stack)
appmesh_colorapp_stack.add_dependency(appmesh_stack)
colorapp_task_definition_stack.add_dependency(appmesh_colorapp_stack)

app.synth()
