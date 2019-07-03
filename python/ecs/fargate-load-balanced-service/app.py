from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    core,
)


class BonjourFargate(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        # Create VPC and Fargate Cluster
        # NOTE: Limit AZs to avoid reaching resource quotas
        vpc = ec2.Vpc(
            self, "MyVpc",
            max_a_zs=2
        )

        cluster = ecs.Cluster(
            self, 'Ec2Cluster',
            vpc=vpc
        )

        fargate_service = ecs_patterns.LoadBalancedFargateService(
            self, "FargateService",
            cluster=cluster,
            image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
        )

        core.CfnOutput(
            self, "LoadBalancerDNS",
            value=fargate_service.load_balancer.load_balancer_dns_name
        )

app = core.App()
BonjourFargate(app, "Bonjour")
app.synth()
