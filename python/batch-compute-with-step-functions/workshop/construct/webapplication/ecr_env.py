from aws_cdk import (
    aws_ecr as _ecr,
    aws_iam as _iam,
    core,
)

class EcrENV(core.Construct):
    
    def getRepositories(self,repo_name):
        return self.repositories[repo_name]
    
    def getRepositoriesList(self):
        return self.repositories.keys()
        
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        
        self.repositories = {}
        
        # ecr repo to push docker container into
        
        self.web_index = _ecr.Repository(
            self, "Web_Index",
            repository_name="web_"+UserName+"/index",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
       
        self.repositories["web_index"] = self.web_index