from aws_cdk import (
    aws_stepfunctions as _sfn,
    aws_stepfunctions_tasks as _sfn_tasks,
    aws_ec2 as _ec2,
    aws_s3 as _s3,
    aws_iam as _iam,
    aws_apigateway as _apigateway,
    core,
)

from construct.webapplication.apigateway import APIDefinition
from construct.webapplication.ecr_env import EcrENV
from construct.webapplication.ecs_env import EcsENV
from construct.webapplication.ecs_task import EcsTASK

class WebApplicationStack(core.Stack):
    
    def getEcrRepo(self):
        return self.My_ECR_Repo
    
    def getAPIGateway(self):
        return self.My_APIGW
        
    def getService(self):
        return self.My_ECS_Task

    def __init__(self, scope: core.Construct, id: str,
        UserName="default",
        EmailAddress="default",
        StateMachine="default",
        Vpc="default",
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)
        
        self.My_ECR_Repo = EcrENV(self,
            "ecr-" + UserName + "-web",
            UserName=UserName
        )
        
        self.My_ECS_ENV = EcsENV(self,
            "ecs-" + UserName + "-web",
            UserName=UserName,
            Vpc=Vpc
        )
        
        self.My_APIGW = APIDefinition(self,
            "apigateway-" + UserName,
            UserName=UserName,
            StateMachine=StateMachine
        )
        
        self.My_ECS_Task = EcsTASK(self,
            "ecstask-" + UserName + "-web",
            UserName=UserName,
            Cluster=self.My_ECS_ENV.getEcsCluster("WebApplicationCluster"),
            Repo=self.My_ECR_Repo,
            Vpc=Vpc,
            APIGateway = self.My_APIGW
        )
        