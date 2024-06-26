from aws_cdk import (
    # Duration,
    Stack,
    aws_iam as iam,
)
from cdk_stacksets import (
    DeploymentType,
    StackSet,
    StackSetStack,
    StackSetTarget,
    StackSetTemplate
)
from constructs import Construct
from .my_stack import MyStackSet
class CdkStacksetPythonStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        
