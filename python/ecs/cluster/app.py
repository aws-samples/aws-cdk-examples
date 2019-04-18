from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    cdk,
)


class ECSCluster(cdk.Stack):

    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.VpcNetwork(
            self, "MyVpc",
            max_a_zs=2
        )

        asg = autoscaling.AutoScalingGroup(
            self, "MyFleet",
            instance_type=ec2.InstanceType("t2.xlarge"),
            machine_image=ecs.EcsOptimizedAmi(),
            associate_public_ip_address=True,
            update_type=autoscaling.UpdateType.ReplacingUpdate,
            desired_capacity=3,
            vpc=vpc
        )

        cluster = ecs.Cluster(
            self, 'EcsCluster',
            vpc=vpc
        )

        cluster.add_autoscaling_group(asg)
        cluster.add_capacity("DefaultAutoScalingGroup",
                             instance_type=ec2.InstanceType("t2.micro"))

app = cdk.App()
ECSCluster(app, "MyFirstEcsCluster")
app.run()
