from aws_cdk import (
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
        stackset_stack = MyStackSet(self, 'MyStackSet')

        ou_ids = self.node.try_get_context('OUIDs')
        StackSet(self, 'StackSet',
            target=StackSetTarget.from_organizational_units(
                regions=['us-east-1', 'us-east-2'],
                organizational_units=ou_ids
            ),
            template=StackSetTemplate.from_stack_set_stack(stackset_stack),
            deployment_type=DeploymentType.service_managed(
                delegated_admin=False,
                auto_deploy_enabled=True,
                auto_deploy_retain_stacks=False
            )
        )
