from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    cdk,
)


class BonjourECS(cdk.Stack):

    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.VpcNetwork(
            self, "MyVpc",
            max_a_zs=2
        )

        cluster = ecs.Cluster(
            self, 'Ec2Cluster',
            vpc=vpc
        )

        cluster.add_capacity("DefaultAutoScalingGroup",
                             instance_type=ec2.InstanceType("t2.micro"))

        ecs_service = ecs.LoadBalancedEc2Service(
            self, "Ec2Service",
            cluster=cluster,
            memory_limit_mi_b=512,
            image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
        )

        cdk.CfnOutput(
            self, "LoadBalancerDNS",
            value=ecs_service.load_balancer.dns_name
        )

app = cdk.App()
BonjourECS(app, "Bonjour")
app.run()
