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
        
        stackset_stack = MyStackSet(self, 'MyStackSet')

        admin_role = iam.Role(self, "AdministrationRole",
            role_name="AWSCloudFormationStackSetAdministrationRole",
            assumed_by=iam.ServicePrincipal("cloudformation.amazonaws.com")
        )
        
        account_ids = self.node.try_get_context('ACCOUNTS')
        print(account_ids)
        
        self_managed_stackset = StackSet(self, 'SelfStackSet',
            target=StackSetTarget.from_accounts(
                regions=['us-east-1', 'us-east-2'],
                accounts=account_ids
            ),
            template=StackSetTemplate.from_stack_set_stack(stackset_stack),
            deployment_type=DeploymentType.self_managed(
                admin_role=admin_role,
                execution_role_name='AWSCloudFormationStackSetExecutionRole'
            )
        )
        
        self_managed_stackset.node.add_dependency(admin_role.node.find_child("DefaultPolicy"))
