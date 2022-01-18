from aws_cdk import (core, 
                     aws_ec2 as _ec2, 
                     aws_batch as _batch,
                     aws_ecs as _ecs,
                     aws_iam as _iam
                     )

class BatchEC2Stack(core.Stack):

    def __init__(self, app: core.App, id: str, **kwargs):
        super().__init__(app, id, **kwargs)

        # This resource alone will create a private/public subnet in each AZ as well as nat/internet gateway(s)
        vpc = _ec2.Vpc(self, "VPC")

        # To create number of Batch Compute Environment
        count = 3

        batch_ce = []

        # For loop to create Batch Compute Environments
        for i in range(count):
            name = "MyBatchEC2Env" + str(i)
            batch_environment = _batch.ComputeEnvironment(self, name,
            compute_resources=_batch.ComputeResources(
                type=_batch.ComputeResourceType.SPOT,
                bid_percentage=75,
                vpc=vpc
                )
            )

            batch_ce.append(_batch.JobQueueComputeEnvironment(compute_environment=batch_environment,order=i))

        # Create AWS Batch Job Queue and associate all Batch CE.
        self.batch_queue = _batch.JobQueue(self, "JobQueue",
                                           compute_environments=batch_ce)


        # Create Job Definition to submit job in batch job queue. 
        batch_jobDef = _batch.JobDefinition(self, "MyJobDef",
                                           job_definition_name="BatchCDKJobDef",
                                           container=_batch.JobDefinitionContainer(image=_ecs.ContainerImage.from_registry(
                                               "public.ecr.aws/amazonlinux/amazonlinux:latest"), command=["sleep", "60"], memory_limit_mib=512, vcpus=1),
                                           )


        # Output resources
        core.CfnOutput(self, "BatchJobQueue",value=self.batch_queue.job_queue_name)
        core.CfnOutput(self, "JobDefinition",value=batch_jobDef.job_definition_name)



app = core.App()
BatchEC2Stack(app, "BatchEC2Stack")
app.synth()