from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
    cdk,
)

# Based on https://aws.amazon.com/blogs/compute/introducing-cloud-native-networking-for-ecs-containers/

app = cdk.App()
stack = cdk.Stack(app, "ec2-service-with-task-networking")

# Create a cluster
vpc = ec2.Vpc(
    stack, "Vpc",
    max_a_zs=2
)

cluster = ecs.Cluster(
    stack, "awsvpc-ecs-demo-cluster",
    vpc=vpc
)
cluster.add_capacity("DefaultAutoScalingGroup",
                     instance_type=ec2.InstanceType("t2.micro"))

# Create a task definition with its own elastic network interface
task_definition = ecs.Ec2TaskDefinition(
    stack, "nginx-awsvpc",
    network_mode=ecs.NetworkMode.AwsVpc
)

web_container = task_definition.add_container(
    "nginx",
    image=ecs.ContainerImage.from_registry("nginx:latest"),
    cpu=100,
    memory_limit_mi_b=256,
    essential=True
)
web_container.add_port_mappings(
    container_port=80,
    protocol=ecs.Protocol.Tcp
)

# Create a security group that allows HTTP traffic on port 80 for our
# containers without modifying the security group on the instance
security_group = ec2.SecurityGroup(
    stack, "nginx--7623",
    vpc=vpc,
    allow_all_outbound=False
)
security_group.add_ingress_rule(
    ec2.AnyIPv4(),
    ec2.TcpPort(80)
)

# Create the service
service = ecs.Ec2Service(
    stack, "awsvpc-ecs-demo-service",
    cluster=cluster,
    task_definition=task_definition,
    security_group=security_group
)

app.run()
