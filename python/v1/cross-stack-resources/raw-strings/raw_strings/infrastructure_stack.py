from aws_cdk import (
    aws_lambda as lambda_,
    aws_dynamodb as ddb,
    core
)

class InfrastructureStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        my_main_func = lambda_.Function(
            self,
            "myMainFunction",
            code=lambda_.InlineCode("def main(event, context)\n  print('hello, world')"),
            handler='index.main',
            runtime=lambda_.Runtime.PYTHON_3_7
        )
        
        # We assign the function's arn to a local variable for the Object.
        self._function_arn = my_main_func.function_arn
    
    # Using the property decorator 
    @property
    def main_function_arn(self):
        return self._function_arn
