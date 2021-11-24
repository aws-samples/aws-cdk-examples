from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
    core,
)

app = core.App()
stack = core.Stack(app, "aws-ec2-integ-ecs")

# Create a cluster
vpc = ec2.Vpc(
    stack, "MyVpc",
    max_azs=2
)

cluster = ecs.Cluster(
    stack, 'EcsCluster',
    vpc=vpc
)
cluster.add_capacity("DefaultAutoScalingGroup",
                     instance_type=ec2.InstanceType.of(
                         ec2.InstanceClass.STANDARD5,
                         ec2.InstanceSize.MICRO))

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
    host_port=8080,
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

health_check = elbv2.HealthCheck(
    interval=core.Duration.seconds(60),
    path="/health",
    timeout=core.Duration.seconds(5)
)

# Attach ALB to ECS Service
listener.add_targets(
    "ECS",
    port=80,
    targets=[service],
    health_check=health_check,
)

core.CfnOutput(
    stack, "LoadBalancerDNS",
    value=lb.load_balancer_dns_name
)

app.synth()
