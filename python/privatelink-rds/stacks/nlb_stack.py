from aws_cdk import (
    core,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elb
)

class NlbStack(core.Stack):
    def __init__(self, scope: core.Construct, id: str, 
        vpc, 
        subnet_group, 
        db_port, 
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)
        
        self.nlb = elb.NetworkLoadBalancer(self, "PrivbatelinkRdsDemoNlb",
            vpc = vpc,
            internet_facing = False,
            load_balancer_name = "PrivatelinkRdsDemoNlb",
            vpc_subnets = ec2.SubnetSelection(subnet_group_name = subnet_group)
        )

        health_check = elb.HealthCheck(
            enabled = True,
            healthy_threshold_count = 2,
            unhealthy_threshold_count = 2,
            interval = core.Duration.seconds(10),
            port = str(db_port)
        )
        
        self.target_group = elb.NetworkTargetGroup(self, "PrivatelinkRdsDemoTargetGroup",
            port = db_port,
            health_check = health_check,
            deregistration_delay = core.Duration.seconds(0),
            vpc = vpc,
            target_type = elb.TargetType('IP')
        )

        listener = self.nlb.add_listener(
            "MySql",
            port = db_port,
            default_target_groups = [self.target_group]
        )
        
        core.CfnOutput(self, "Output",
            value = "NLB ARN: " + self.nlb.load_balancer_arn + "\nTG ARN: " + self.target_group.target_group_arn
        )

