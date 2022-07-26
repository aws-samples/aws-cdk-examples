from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_ecs as ecs,
    App, CfnOutput, Duration, Stack
)

app = App()
stack = Stack(app, "sample-aws-ec2-integ-ecs")

# Create a cluster
vpc = ec2.Vpc(
    stack, "MyVpc",
    max_azs=2
)

cluster = ecs.Cluster(
    stack, 'EcsCluster',
    vpc=vpc
)

asg = autoscaling.AutoScalingGroup(
    stack, "DefaultAutoScalingGroup",
    instance_type=ec2.InstanceType.of(
                         ec2.InstanceClass.BURSTABLE3,
                         ec2.InstanceSize.MICRO),
    machine_image=ecs.EcsOptimizedImage.amazon_linux2(),
    vpc=vpc
)

capacity_provider = ecs.AsgCapacityProvider(stack, "AsgCapacityProvider",
    auto_scaling_group=asg
)

cluster.add_asg_capacity_provider(capacity_provider)

# Create Task Definition
task_definition = ecs.Ec2TaskDefinition(
    stack, "TaskDef")

container = task_definition.add_container(
    "web",
    image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample"),
    memory_limit_mib=256
)

port_mapping = ecs.PortMapping(
    container_port=80,
    host_port=0,
    protocol=ecs.Protocol.TCP
)

container.add_port_mappings(port_mapping)

# Create Service
service = ecs.Ec2Service(
    stack, "Service",
    cluster=cluster,
    task_definition=task_definition
)


# Create ALB
lb = elbv2.ApplicationLoadBalancer(
    stack, "LB",
    vpc=vpc,
    internet_facing=True
)

listener = lb.add_listener(
    "PublicListener",
    port=80,
    open=True
)

asg.connections.allow_from(lb, port_range=ec2.Port.tcp_range(32768, 65535), description="allow incoming traffic from ALB")

health_check = elbv2.HealthCheck(
    interval=Duration.seconds(60),
    path="/health",
    timeout=Duration.seconds(5)
)

# Attach ALB to ECS Service
listener.add_targets(
    "ECS",
    port=80,
    targets=[service],
    health_check=health_check,
)

CfnOutput(
    stack, "LoadBalancerDNS",
    value="http://"+lb.load_balancer_dns_name
)

app.synth()
