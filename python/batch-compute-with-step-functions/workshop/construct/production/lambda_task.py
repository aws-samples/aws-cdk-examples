from aws_cdk import (
    aws_lambda as _lambda,
    aws_s3 as _s3,
    aws_iam as _iam,
    core,
)

class LambdaTask(core.Construct):

    def getLambdaFunction(self,name):
        return self.function_list[name]

    def __init__(self, scope: core.Construct, id: str, TargetS3="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.function_list = {}
        
        self.lambda_compute_role = _iam.Role(self, 'lambda_compute_role',
            assumed_by = _iam.CompositePrincipal(
                _iam.ServicePrincipal('lambda.amazonaws.com'),
            ),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess")
            ]
        )
        
        TargetS3.grant_read_write(self.lambda_compute_role)

        self.Get_Job_List = _lambda.Function(
            self, 'Get_Job_List',
            runtime = _lambda.Runtime.PYTHON_3_7,
            handler = 'get_job_list.handler',
            code = _lambda.Code.asset('workshop/lambda/get_job_list'),
            # environment = {
            #     'BUCKET': "",
            #     'KEY': "",
            # },
            timeout=core.Duration.seconds(15),
            role = self.lambda_compute_role
        )
        
        self.function_list["Get_Job_List"] = self.Get_Job_List
        
        self.Get_Output_size = _lambda.Function(
            self, 'Get_Output_size',
            runtime = _lambda.Runtime.PYTHON_3_7,
            handler = 'get_output_size.handler',
            code = _lambda.Code.asset('workshop/lambda/get_output_size'),
            timeout=core.Duration.seconds(15),
            role = self.lambda_compute_role
        )
        
        self.function_list["Get_Output_size"] = self.Get_Output_size
