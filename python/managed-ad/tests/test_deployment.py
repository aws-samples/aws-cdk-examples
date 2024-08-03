import os
import unittest
from aws_cdk import App, Environment
from managed_ad.managed_ad_stack import ManagedAdStack


class TestDeployment(unittest.TestCase):

    def test_managed_ad_deployment(self):
        env = Environment(
            account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
            region=os.environ.get("CDK_DEFAULT_REGION"),
        )
        app = App()
        managed_ad_stack = ManagedAdStack(app, "ManagedAdStack", env=env)
        app.synth()

        # Update the following assertions to reflect any changes in the stack synthesis and deployment
        self.assertIsNotNone(managed_ad_stack.vpc)
        self.assertIsNotNone(managed_ad_stack.directory_service)
        self.assertIsNotNone(managed_ad_stack.password_rotator_lambda)


if __name__ == "__main__":
    unittest.main()
