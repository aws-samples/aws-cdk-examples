from aws_cdk import (
    aws_batch as _batch,
    aws_ec2 as _ec2,
    aws_iam as _iam,
    core,
)

class BatchENV(core.Construct):
    
    def getComputeQueue(self,queue_name):
        return self.job_queue[queue_name]
        
    
    def __init__(self, scope: core.Construct, id: str,CurrentVPC="default",TargetS3="default",UserName="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        
        self.job_queue = {}
        
        # batch service role
        self.batch_service_role = _iam.Role(self,'BatchServiceRole',
            assumed_by=_iam.ServicePrincipal('batch.amazonaws.com'),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AWSBatchServiceRole')
            ]
        )
        
        # ec2 role with policy that allow to get object from s3 bucket for batch computing 
        self.batch_compute_role = _iam.Role(self, 'BatchComputeRole',
            assumed_by=_iam.CompositePrincipal(
                _iam.ServicePrincipal('ec2.amazonaws.com'),
                _iam.ServicePrincipal('ecs.amazonaws.com')
            ),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AmazonEC2RoleforSSM'),
                _iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2ContainerServiceforEC2Role"),
                _iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess")
            ]
        )
        
        TargetS3.grant_read_write(self.batch_compute_role)

        self.batch_compute_instance_profile = _iam.CfnInstanceProfile(
            self,
            'BatchInstanceProfile' + UserName,
            instance_profile_name='BatchInstanceProfile-' + UserName,
            roles=[self.batch_compute_role.role_name]
        )
        
        self.ComputeENV = _batch.ComputeEnvironment(self, "ComputeENV",
            service_role=self.batch_service_role,
            compute_resources={
                "vpc": CurrentVPC,
                "instance_types":[
                    _ec2.InstanceType("c5"),
                    _ec2.InstanceType("m5")
                ],
                "maxv_cpus":128,
                "minv_cpus":0,
                "type":_batch.ComputeResourceType.SPOT,
                "allocation_strategy":_batch.AllocationStrategy.BEST_FIT_PROGRESSIVE,
                "instance_role":self.batch_compute_instance_profile.instance_profile_name
            }
        )
        
        self.ComputeQueue = _batch.JobQueue(self,"ComputeQueue",
            priority=1,
            compute_environments=[
                _batch.JobQueueComputeEnvironment(
                    compute_environment=self.ComputeENV,
                    order=1
                )
            ]
        )
        self.job_queue["ComputeQueue"] = self.ComputeQueue