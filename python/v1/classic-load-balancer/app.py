from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_elasticloadbalancing as elb,
    core
)


class LoadBalancerStack(core.Stack):
    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        vpc = ec2.Vpc(self, "VPC")

        asg = autoscaling.AutoScalingGroup(
            self, "ASG",
            vpc=vpc,
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO
            ),
            machine_image=ec2.AmazonLinuxImage(),
        )

        lb = elb.LoadBalancer(
            self, "LB",
            vpc=vpc,
            internet_facing=True,
            health_check={"port": 80}
        )
        lb.add_target(asg)

        listener = lb.add_listener(external_port=80)
        listener.connections.allow_default_port_from_any_ipv4("Open to the world")


app = core.App()
LoadBalancerStack(app, "LoadBalancerStack")
app.synth()
