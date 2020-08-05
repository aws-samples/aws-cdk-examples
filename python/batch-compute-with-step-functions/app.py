#!/usr/bin/env python3

from aws_cdk import core

from workshop.stack.production_stack import ProductionStack
from workshop.stack.cicdpipeline_stack import CICDPipelineStack
from workshop.stack.webapplication_stack import WebApplicationStack


UserName = "example"
EmailAddress = "example@qq.com"
# CustomeENV = core.Environment(account="2383838383xxx", region="ap-northeast-1")
CustomeENV = core.Environment(region="ap-northeast-1")

app = core.App()
Production = ProductionStack(app, 
    "Production-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    env=CustomeENV
)


WebApplication = WebApplicationStack(app, 
    "WebApplication-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    Vpc=Production.getVpc(),
    StateMachine = Production.getStateMachine(),
    env=CustomeENV
)

CICDPipeline = CICDPipelineStack(app, 
    "CICDPipeline-" + UserName.lower(),
    UserName = UserName.lower(),
    EmailAddress = EmailAddress,
    BatchRepo = Production.getEcrRepo(),
    WebRepo = WebApplication.getEcrRepo(),
    WebService = WebApplication.getService(),
    env=CustomeENV
)


app.synth()
