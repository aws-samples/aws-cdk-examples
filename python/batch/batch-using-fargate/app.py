from aws_cdk import (core, 
                     aws_ec2 as _ec2, 
                     aws_batch as _batch,
                     aws_ecs as _ecs,
                     aws_iam as _iam
                     )

class BatchFargateStack(core.Stack):

    def __init__(self, app: core.App, id: str, **kwargs):
        super().__init__(app, id, **kwargs)

        # This resource alone will create a private/public subnet in each AZ as well as nat/internet gateway(s)
        vpc = _ec2.Vpc(self, "VPC")

        # To create number of Batch Compute Environment
        count = 3

        fargate_batch_ce = []

        # For loop to create Batch Compute Environments
        for i in range(count):
            name = "MyFargateEnv" + str(i)
            fargate_spot_environment = _batch.ComputeEnvironment(self, name,
            compute_resources=_batch.ComputeResources(
                type=_batch.ComputeResourceType.FARGATE,
                vpc=vpc
                )
            )

            fargate_batch_ce.append(_batch.JobQueueComputeEnvironment(compute_environment=fargate_spot_environment,order=i))

        # Create AWS Batch Job Queue and associate all Batch CE.
        self.batch_queue = _batch.JobQueue(self, "JobQueue",
                                           compute_environments=fargate_batch_ce)

        # Task execution IAM role for Fargate
        task_execution_role = _iam.Role(self, "TaskExecutionRole",
                                  assumed_by=_iam.ServicePrincipal(
                                      "ecs-tasks.amazonaws.com"),
                                  managed_policies=[_iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonECSTaskExecutionRolePolicy")])

        # Create Job Definition to submit job in batch job queue. 
        batch_jobDef = _batch.JobDefinition(self, "MyJobDef",
                                           job_definition_name="FargateCDKJobDef",
                                           platform_capabilities=[_batch.PlatformCapabilities("FARGATE")],
                                           container=_batch.JobDefinitionContainer(image=_ecs.ContainerImage.from_registry(
                                               "public.ecr.aws/amazonlinux/amazonlinux:latest"), command=["sleep", "60"], memory_limit_mib=512, vcpus=0.25,
                                               execution_role=task_execution_role),
                                           )


        # Output resources
        core.CfnOutput(self, "BatchJobQueue",value=self.batch_queue.job_queue_name)
        core.CfnOutput(self, "JobDefinition",value=batch_jobDef.job_definition_name)



app = core.App()
BatchFargateStack(app, "BatchFargateStack")
app.synth()