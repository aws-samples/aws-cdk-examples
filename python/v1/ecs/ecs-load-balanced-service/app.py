from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    core,
)


class BonjourECS(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        cluster = ecs.Cluster(
            self, 'Ec2Cluster',
            vpc=vpc
        )

        cluster.add_capacity("DefaultAutoScalingGroup",
                             instance_type=ec2.InstanceType("t2.micro"))

        ecs_service = ecs_patterns.NetworkLoadBalancedEc2Service(
            self, "Ec2Service",
            cluster=cluster,
            memory_limit_mib=512,
            task_image_options={
                'image': ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
            }
        )

        core.CfnOutput(
            self, "LoadBalancerDNS",
            value=ecs_service.load_balancer.load_balancer_dns_name
        )

app = core.App()
BonjourECS(app, "Bonjour")
app.synth()
