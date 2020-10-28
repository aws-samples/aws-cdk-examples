from aws_cdk import (
    core
)

from construct.cicdpipeline.cicd_batch import CICDBatch
from construct.cicdpipeline.cicd_web import CICDWeb

class CICDPipelineStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str,
        UserName="default",
        EmailAddress="default",
        BatchRepo="default",
        WebRepo="default",
        WebService="default",
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)
        
        self.My_CICDBatch = CICDBatch(self,
            "CICDBatch-" + UserName,
            UserName=UserName,
            Repo=BatchRepo
        )
        
        self.My_CICDWeb = CICDWeb(self,
            "CICDWeb-" + UserName,
            UserName=UserName,
            Repo=WebRepo,
            WebService=WebService
        )