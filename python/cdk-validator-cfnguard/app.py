#!/usr/bin/env python3

import aws_cdk as cdk
import cdklabs.cdk_validator_cfnguard

from cdk_validator_cfnguard.cdk_validator_cfnguard_stack import CdkValidatorCfnguardStack

# For reference, see https://github.com/cdklabs/cdk-validator-cfnguard
# For reference, see https://pypi.org/project/cdklabs.cdk-validator-cfnguard/
app = cdk.App(
    policy_validation_beta1 = [
        cdklabs.cdk_validator_cfnguard.CfnGuardValidator(
            # By default the CfnGuardValidator plugin has the Control Tower proactive
            # rules enabled. If you wish to disable them, set this to false.
            control_tower_rules_enabled = True,
            # You can also disable individual rules by passing in a list of rule names
            # e.g. "ct-s3-pr-1" list is https://github.com/cdklabs/cdk-validator-cfnguard
            disabled_rules=[],
            # You can also pass in a list of local guard files or directory paths
            # e.g. "./guards", "./guards/custom-guard-file.guard"
            rules=[],
            )
    ]
)
CdkValidatorCfnguardStack(app, "CdkValidatorCfnguardStack",)

app.synth()
