from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    App, Stack
)

# Based on https://aws.amazon.com/blogs/compute/introducing-cloud-native-networking-for-ecs-containers/

app = App()
stack = Stack(app, "ec2-service-with-task-networking")

# Create a cluster
vpc = ec2.Vpc(
    stack, "Vpc",
    max_azs=2
)

cluster = ecs.Cluster(
    stack, "awsvpc-ecs-demo-cluster",
    vpc=vpc
)

asg = autoscaling.AutoScalingGroup(
    stack, "DefaultAutoScalingGroup",
    instance_type=ec2.InstanceType("t2.micro"),
    machine_image=ecs.EcsOptimizedImage.amazon_linux2(),
    vpc=vpc,
)
capacity_provider = ecs.AsgCapacityProvider(stack, "AsgCapacityProvider",
    auto_scaling_group=asg
)
cluster.add_asg_capacity_provider(capacity_provider)

# Create a task definition with its own elastic network interface
task_definition = ecs.Ec2TaskDefinition(
    stack, "nginx-awsvpc",
    network_mode=ecs.NetworkMode.AWS_VPC,
)

web_container = task_definition.add_container(
    "nginx",
    image=ecs.ContainerImage.from_registry("nginx:latest"),
    cpu=100,
    memory_limit_mib=256,
    essential=True
)
port_mapping = ecs.PortMapping(
    container_port=80,
    protocol=ecs.Protocol.TCP
)
web_container.add_port_mappings(port_mapping)

# Create a security group that allows HTTP traffic on port 80 for our
# containers without modifying the security group on the instance
security_group = ec2.SecurityGroup(
    stack, "nginx--7623",
    vpc=vpc,
    allow_all_outbound=False
)
security_group.add_ingress_rule(
    ec2.Peer.any_ipv4(),
    ec2.Port.tcp(80)
)

# Create the service
service = ecs.Ec2Service(
    stack, "awsvpc-ecs-demo-service",
    cluster=cluster,
    task_definition=task_definition,
    security_groups=[security_group]
)

app.synth()
