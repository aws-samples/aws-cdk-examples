from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    CfnOutput, Stack
)
from constructs import Construct

# Need to Change different app
class FargateAppStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create VPC and Fargate Cluster
        # NOTE: Limit AZs to avoid reaching resource quotas
        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        cluster = ecs.Cluster(
            self, 'Ec2Cluster',
            vpc=vpc
        )

        self.fargate_service = ecs_patterns.NetworkLoadBalancedFargateService(
            self, "FargateService",
            cluster=cluster,
            task_image_options=ecs_patterns.NetworkLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
            )
        )

        self.fargate_service.service.connections.security_groups[0].add_ingress_rule(
            peer = ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection = ec2.Port.tcp(80),
            description="Allow http inbound from VPC"
        )

        CfnOutput(
            self, "LoadBalancerDNS",
            value=self.fargate_service.load_balancer.load_balancer_dns_name
        )