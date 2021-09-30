from aws_cdk import (
    aws_lambda as _lambda,
    core as cdk,
)


class LambdaLayerStack(cdk.Stack):
    def __init__(self, app: cdk.App, id: str) -> None:
        super().__init__(app, id)

        # create layer
        layer = _lambda.LayerVersion(self, 'helper_layer',
                                     code=_lambda.Code.from_asset("layer"),
                                     description='Common helper utility',
                                     compatible_runtimes=[
                                         _lambda.Runtime.PYTHON_3_6,
                                         _lambda.Runtime.PYTHON_3_7,
                                         _lambda.Runtime.PYTHON_3_8
                                     ],
                                     removal_policy=cdk.RemovalPolicy.DESTROY
                                     )
        # create lambda function
        function = _lambda.Function(self, "lambda_function",
                                    runtime=_lambda.Runtime.PYTHON_3_8,
                                    handler="index.handler",
                                    code=_lambda.Code.asset("lambda"),
                                    layers=[layer])


app = cdk.App()
LambdaLayerStack(app, "LambdaLayerExample")
app.synth()
