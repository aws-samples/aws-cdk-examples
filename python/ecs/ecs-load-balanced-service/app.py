from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    App, CfnOutput, Stack
)
from constructs import Construct


class BonjourECS(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        cluster = ecs.Cluster(
            self, 'Ec2Cluster',
            vpc=vpc
        )

        asg = autoscaling.AutoScalingGroup(
            self, "DefaultAutoScalingGroup",
            instance_type=ec2.InstanceType("t2.micro"),
            machine_image=ecs.EcsOptimizedImage.amazon_linux2(),
            vpc=vpc,
        )
        capacity_provider = ecs.AsgCapacityProvider(self, "AsgCapacityProvider",
            auto_scaling_group=asg
        )
        cluster.add_asg_capacity_provider(capacity_provider)

        ecs_service = ecs_patterns.NetworkLoadBalancedEc2Service(
            self, "Ec2Service",
            cluster=cluster,
            memory_limit_mib=512,
            task_image_options=ecs_patterns.NetworkLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
            )
        )

        asg.connections.allow_from_any_ipv4(port_range=ec2.Port.tcp_range(32768, 65535), description="allow incoming traffic from ALB")

        CfnOutput(
            self, "LoadBalancerDNS",
            value="http://"+ecs_service.load_balancer.load_balancer_dns_name
        )

app = App()
BonjourECS(app, "Bonjour")
app.synth()
