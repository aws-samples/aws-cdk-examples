from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
    cdk,
)

app = cdk.App()
stack = cdk.Stack(app, "aws-ec2-integ-ecs")

# Create a cluster
vpc = ec2.Vpc(
    stack, "MyVpc",
    max_a_zs=2
)

cluster = ecs.Cluster(
    stack, 'EcsCluster',
    vpc=vpc
)
cluster.add_capacity("DefaultAutoScalingGroup",
                     instance_type=ec2.InstanceType("t2.micro"))

# Create Task Definition
task_definition = ecs.Ec2TaskDefinition(
    stack, "TaskDef")
container = task_definition.add_container(
    "web",
    image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample"),
    memory_limit_mi_b=256
)
container.add_port_mappings(
    container_port=80,
    host_port=8080,
    protocol=ecs.Protocol.Tcp
)

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

# Attach ALB to ECS Service
listener.add_targets(
    "ECS",
    port=80,
    targets=[service],
    health_check={
        "interval_secs": 60,
        "path": "/health",
        "timeout_seconds": 5
    }
)

cdk.CfnOutput(
    stack, "LoadBalancerDNS",
    value=lb.load_balancer_dns_name
)

app.run()
