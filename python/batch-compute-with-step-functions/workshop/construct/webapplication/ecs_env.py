from aws_cdk import (
    aws_ecs as _ecs,
    aws_iam as _iam,
    core,
)

class EcsENV(core.Construct):
    
    def getEcsCluster(self,ClusterName):
        return self.ClusterList[ClusterName]
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",Vpc="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.ClusterList = {}
        
        self.FargateCluster = _ecs.Cluster(self,
            "FargateCluster-" + UserName,
            vpc=Vpc
        )
        self.ClusterList['WebApplicationCluster'] = self.FargateCluster