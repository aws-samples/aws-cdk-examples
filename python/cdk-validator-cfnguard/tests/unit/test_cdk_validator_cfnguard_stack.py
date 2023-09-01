import aws_cdk as core
from aws_cdk import assertions

from cdk_validator_cfnguard.cdk_validator_cfnguard_stack import CdkValidatorCfnguardStack

def test_sqs_queue_created():
    app = core.App()
    stack = CdkValidatorCfnguardStack(app, "cdk-validator-cfnguard")
    assertions.Template.from_stack(stack)
