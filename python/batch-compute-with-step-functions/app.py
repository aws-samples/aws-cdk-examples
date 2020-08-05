#!/usr/bin/env python3

from aws_cdk import core

from workshop.stack.production_stack import ProductionStack
from workshop.stack.cicdpipeline_stack import CICDPipelineStack
from workshop.stack.webapplication_stack import WebApplicationStack


UserName = "example"
EmailAddress = "example@qq.com"
CustomeENV = core.Environment(account="2383838383xxx", region="ap-northeast-1")

app = core.App()
Production = ProductionStack(app, 
    "Production-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    env=Custome_ENV
)


WebApplication = WebApplicationStack(app, 
    "WebApplication-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    Vpc=Production.getVpc(),
    StateMachine = Production.getStateMachine(),
    env=Custome_ENV
)

CICDPipeline = CICDPipelineStack(app, 
    "CICDPipeline-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    BatchRepo = Production.getEcrRepo(),
    WebRepo = WebApplication.getEcrRepo(),
    WebService = WebApplication.getService(),
    env=Custome_ENV
)


app.synth()
