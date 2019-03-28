from aws_cdk import cdk
from aws_cdk import aws_cloudformation as cfn, aws_lambda as lambda_


class MyCustomResource(cdk.Construct):
    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id,)

        with open("custom-resource-handler.py", encoding="utf-8") as fp:
            code_body = fp.read()

        resource = cfn.CustomResource(
            self, "Resource", lambda_provider=lambda_.SingletonFunction(
                self,
                "Singleton",
                uuid="f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc",
                code=lambda_.InlineCode(code_body),
                handler="index.main",
                timeout=300,
                runtime=lambda_.Runtime.PYTHON27,
            ),
            properties=kwargs,
        )

        self.response = resource.get_att("Response").to_string()
