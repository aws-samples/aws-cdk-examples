from aws_cdk import cdk

from my_custom_resource import MyCustomResource


# A Stack that sets up MyCustomResource and shows how to get an attribute from it.
class MyStack(cdk.Stack):
    def __init__(self, scope: cdk.App, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        resource = MyCustomResource(
            self, "DemoResource", message="CustomResource says hello"
        )

        # Publish the custom resource output
        cdk.CfnOutput(
            self,
            "ResponseMessage",
            description="The message that came back from the Custom Resource",
            value=resource.response,
        )


app = cdk.App()
MyStack(app, "CustomResourceDemoStack")
app.run()
