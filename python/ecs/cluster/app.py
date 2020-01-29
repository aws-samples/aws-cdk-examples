from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    core,
)


class ECSCluster(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        asg = autoscaling.AutoScalingGroup(
            self, "MyFleet",
            instance_type=ec2.InstanceType("t2.xlarge"),
            machine_image=ecs.EcsOptimizedAmi(),
            associate_public_ip_address=True,
            update_type=autoscaling.UpdateType.REPLACING_UPDATE,
            desired_capacity=3,
            vpc=vpc,
            vpc_subnets={ 'subnet_type': ec2.SubnetType.PUBLIC },
        )

        cluster = ecs.Cluster(
            self, 'EcsCluster',
            vpc=vpc
        )

        cluster.add_auto_scaling_group(asg)
        cluster.add_capacity("DefaultAutoScalingGroup",
                             instance_type=ec2.InstanceType("t2.micro"))

app = core.App()
ECSCluster(app, "MyFirstEcsCluster")
app.synth()
