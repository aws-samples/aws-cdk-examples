from aws_cdk import Duration, Stack
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_events as events
from aws_cdk import aws_events_targets as targets
from aws_cdk import aws_s3 as s3
from constructs import Construct


class S3EventbridgeEcsStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        vpc = ec2.Vpc(self, "ecsVpc")

        s3_bucket = s3.Bucket(
            self,
            "bucket",
            access_control=s3.BucketAccessControl.PRIVATE,
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )
        # allow s3 bucket to send notification to eventbridge
        s3_bucket.enable_event_bridge_notification()

        ecs_cluster = ecs.Cluster(
            self,
            id="ecscluster",
            vpc=vpc,
            container_insights=True,
            enable_fargate_capacity_providers=True,
        )

        # create task definition
        task_definition = ecs.FargateTaskDefinition(self, id="taskdef", cpu=256)
        image = ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
        container = task_definition.add_container(id="amazoncontainer", image=image)
        container.add_port_mappings(ecs.PortMapping(container_port=8080))

        # eventbridge rule to trigger stand alone task on ecs cluster when an objects gets added or deleted in s3 bucket
        self.event_rule = events.Rule(
            self,
            "ecsRule",
            description="Rule to trigger ecs task",
            event_pattern=events.EventPattern(
                source=["aws.s3"],
                detail_type=["Object Created", "Object Deleted"],
                detail={"bucket": {"name": [s3_bucket.bucket_name]}},
            ),
        )
        self.event_rule.add_target(
            targets.EcsTask(
                cluster=ecs_cluster,
                task_definition=task_definition,
                task_count=1,
                enable_execute_command=True,
            )
        )
