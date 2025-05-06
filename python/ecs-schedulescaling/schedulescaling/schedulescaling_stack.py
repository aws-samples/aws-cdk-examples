from aws_cdk import Duration, Stack
from aws_cdk import aws_applicationautoscaling as appscaling
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecs_patterns as ecs_patterns
from aws_cdk import aws_iam as iam
from aws_cdk import aws_sns_subscriptions as subs
from constructs import Construct


class SchedulescalingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        scaling = self.node.try_get_context("scaling")
        dayschedule = self.node.try_get_context("daytime")
        nightschedule = self.node.try_get_context("nightime")

        min_capacity = 1
        max_capacity = 1

        # daytime scaling schedule(UTC)
        day_schedule = dayschedule[0]["cron"]
        day_min = dayschedule[1]["min"]
        day_max = dayschedule[2]["max"]

        # nighttime scaling schedule(UTC)
        night_schedule = nightschedule[0]["cron"]
        night_min = nightschedule[1]["min"]
        night_max = nightschedule[2]["max"]

        vpc = ec2.Vpc(self, "ecsVpc", max_azs=2)

        ecs_cluster = ecs.Cluster(
            self,
            id="ecscluster",
            vpc=vpc,
            container_insights=True,
            enable_fargate_capacity_providers=True,
        )

        # create task definition
        task_definition = ecs.FargateTaskDefinition(self, "taskdef", cpu=256)
        image = ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
        container = task_definition.add_container(id="ecs-con-task", image=image)
        container.add_port_mappings(ecs.PortMapping(container_port=8080))

        # define service
        service = ecs.FargateService(
            self, "FargateService", cluster=ecs_cluster, task_definition=task_definition
        )
        # define autoscaling
        if scaling:
            target = appscaling.ScalableTarget(
                self,
                "ScalableTarget",
                service_namespace=appscaling.ServiceNamespace.ECS,
                min_capacity=min_capacity,
                max_capacity=max_capacity,
                resource_id=f"service/{ecs_cluster.cluster_name}/{service.service_name}",
                scalable_dimension="ecs:service:DesiredCount",
            )
            target.scale_on_schedule(
                "daytime",
                schedule=appscaling.Schedule.expression(day_schedule),
                min_capacity=day_min,
                max_capacity=day_max,
            )
            target.scale_on_schedule(
                "nighttime",
                schedule=appscaling.Schedule.expression(night_schedule),
                min_capacity=night_min,
                max_capacity=night_max,
            )
