from aws_cdk import (
    aws_iam as _iam,
    aws_apigateway as _apigateway,
    aws_iam as _iam,
    aws_lambda as _lambda,
    core,
)


class APIDefinition(core.Construct):
    def getAPIGateway(self,APIName):
        return self.taskdefine[APIName]

    def __init__(self, scope: core.Construct, id: str,UserName="default",StateMachine="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.taskdefine = {}
        
        self.lambda_compute_role = _iam.Role(self, 'lambda_compute_role',
            assumed_by = _iam.CompositePrincipal(
                _iam.ServicePrincipal('lambda.amazonaws.com'),
            ),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess")
            ]
        )
        StateMachine.grant_start_execution(self.lambda_compute_role)
        
        self.Call_Stepfunctions = _lambda.Function(
            self, 'Call_Stepfunctions',
            runtime = _lambda.Runtime.PYTHON_3_7,
            handler = 'call_stepfunctions.handler',
            code = _lambda.Code.asset('workshop/lambda/call_stepfunctions'),
            timeout=core.Duration.seconds(15),
            environment = {
                'StatemachineArn': StateMachine.state_machine_arn
            },
            role = self.lambda_compute_role
        )
        
        self.APIGW = _apigateway.LambdaRestApi(self,
            "Apigateway-" + UserName,
            endpoint_types=[_apigateway.EndpointType.REGIONAL],
            handler=self.Call_Stepfunctions
        )
        
        self.taskdefine["SubmitForm"] = self.APIGW
        