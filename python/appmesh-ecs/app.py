#!/usr/bin/env python3
import os

import aws_cdk as cdk
from aws_cdk import App, Stack
from core_infrastructure.vpc.vpc_stack import VPCStack
from core_infrastructure.ecs.ecs_stack import ECSStack
from core_infrastructure.appmesh.appmesh_stack import AppMeshStack 
from colorapp.ecs_colorapp_stack import ColorAppStack
from colorapp.appmesh_colorapp import ServiceMeshColorAppStack
from core_infrastructure.ecr.ecr_stack import ECRStack
from task_definitions.color_app_task_definition_stack import ColorAppTaskDefinitionStack
app = cdk.App()

vpc_stack =VPCStack(app, "VPCStack")
ecs_stack = ECSStack(app, "ECSClusterStack")
appmesh_stack = AppMeshStack(app, "AppMeshStack")
ecr_stack = ECRStack(app, "ECRStack")
color_app_stack = ColorAppStack(app, "ColorAppStack")   
appmesh_colorapp_stack = ServiceMeshColorAppStack(app, "AppmeshColorappStack")
colorapp_task_definition_stack = ColorAppTaskDefinitionStack(app, "ColorAppTaskDefinitionStack")

ecs_stack.add_dependency(vpc_stack)
appmesh_stack.add_dependency(ecs_stack)
appmesh_colorapp_stack.add_dependency(appmesh_stack)
colorapp_task_definition_stack.add_dependency(appmesh_colorapp_stack)
color_app_stack.add_dependency(colorapp_task_definition_stack)


app.synth()
