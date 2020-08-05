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
        
        self.string_merge = _ecr.Repository(
            self, "string_merge",
            repository_name="batch_"+UserName+"/string_merge",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        self.string_repeat = _ecr.Repository(
            self, "string_repeat",
            repository_name="batch_"+UserName+"/string_repeat",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        self.string_reverse = _ecr.Repository(
            self, "string_reverse",
            repository_name="batch_"+UserName+"/string_reverse",
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        self.string_split = _ecr.Repository(
            self, "string_split",
            repository_name="batch_"+UserName+"/string_split",
            removal_policy=core.RemovalPolicy.DESTROY
        )

        self.repositories["string_merge"] = self.string_merge
        self.repositories["string_repeat"] = self.string_repeat
        self.repositories["string_reverse"] = self.string_reverse
        self.repositories["string_split"] = self.string_split