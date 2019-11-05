from aws_cdk import (
    aws_cloudformation as cfn,
    aws_lambda as lambda_,
    core
)


class MyCustomResource(core.Construct):
    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id)

        with open("custom-resource-handler.py", encoding="utf-8") as fp:
            code_body = fp.read()

        resource = cfn.CustomResource(
            self, "Resource",
            provider=cfn.CustomResourceProvider.lambda_(
                lambda_.SingletonFunction(
                    self, "Singleton",
                    uuid="f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc",
                    code=lambda_.InlineCode(code_body),
                    handler="index.main",
                    timeout=core.Duration.seconds(300),
                    runtime=lambda_.Runtime.PYTHON_3_7,
                )
            ),
            properties=kwargs,
        )

        self.response = resource.get_att("Response").to_string()
