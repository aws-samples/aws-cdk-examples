from aws_cdk import core

from my_custom_resource import MyCustomResource


# A Stack that sets up MyCustomResource and shows how to get an
# attribute from it.

class MyStack(core.Stack):
    def __init__(self, scope: core.App, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        resource = MyCustomResource(
            self, "DemoResource",
            message="CustomResource says hello",
        )

        # Publish the custom resource output
        core.CfnOutput(
            self, "ResponseMessage",
            description="The message that came back from the Custom Resource",
            value=resource.response,
        )


app = core.App()
MyStack(app, "CustomResourceDemoStack")
app.synth()
