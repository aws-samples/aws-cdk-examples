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

        # Add assertions to verify the stack synthesis and deployment


if __name__ == "__main__":
    unittest.main()
