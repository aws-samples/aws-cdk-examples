from aws_cdk import (aws_ec2 as ec2, 
                     aws_batch_alpha as batch,
                     aws_ecs as ecs,
                     App, CfnOutput, Stack, Size
                     )
from constructs import Construct

class BatchEC2Stack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # This resource alone will create a private/public subnet in each AZ as well as nat/internet gateway(s)
        vpc = ec2.Vpc(self, "VPC")

        # To create number of Batch Compute Environment
        count = 3

        # Create AWS Batch Job Queue
        self.batch_queue = batch.JobQueue(self, "JobQueueArm64")

        # For loop to create Batch Compute Environments
        for i in range(count):
            name = "MyBatchARM64Env" + str(i)
            batch_environment = batch.ManagedEc2EcsComputeEnvironment(self, name,
                spot=True,
                spot_bid_percentage=75,
                instance_types=[ec2.InstanceType("a1.medium"),ec2.InstanceType("a1.large")],
                vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_NAT),
                vpc=vpc
            )

            self.batch_queue.add_compute_environment(batch_environment, i)

        # Create ECS Job Definition to submit job in batch job queue.
        batch_jobDef = batch.EcsJobDefinition(self, "MyJobDefArm64",
                                           container=batch.EcsEc2ContainerDefinition(self, "CDKJobDefArm64",
                                               image=ecs.ContainerImage.from_registry("public.ecr.aws/amazonlinux/amazonlinux:latest"),
                                               command=["sleep", "60"],
                                               memory=Size.mebibytes(512),
                                               cpu=1
                                           )
        )

        # Output resources
        CfnOutput(self, "BatchJobQueue",value=self.batch_queue.job_queue_name)
        CfnOutput(self, "EcsJobDefinition",value=batch_jobDef.job_definition_name)



app = App()
BatchEC2Stack(app, "BatchEC2Stack")
app.synth()
