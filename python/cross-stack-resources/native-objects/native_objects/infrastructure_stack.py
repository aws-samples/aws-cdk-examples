from aws_cdk import (
    aws_lambda as lambda_,
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
        
        # We assign the function to a local variable for the Object.
        self._function = my_main_func
    
    # Using the property decorator 
    @property
    def main_function(self) -> lambda_.IFunction:
        return self._function
