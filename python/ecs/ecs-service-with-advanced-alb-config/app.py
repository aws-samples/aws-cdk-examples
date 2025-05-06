from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_ecs as ecs,
    aws_iam as iam,
    App, CfnOutput, Duration, Stack
)

# Initialize the CDK app and stack
app = App()
stack = Stack(app, "sample-aws-ec2-integ-ecs")

# Create VPC with 2 Availability Zones
vpc = ec2.Vpc(
    stack, "MyVpc",
    max_azs=2
)

# Create ECS cluster in the VPC
cluster = ecs.Cluster(
    stack, 'EcsCluster',
    vpc=vpc
)

# Create Auto Scaling Group for ECS cluster using launchtemplates
# Uses t3.micro instances with Amazon Linux 2 ECS-optimized AMI
asg = autoscaling.AutoScalingGroup(
    stack, "DefaultAutoScalingGroup",
    vpc=vpc,
    launch_template=ec2.LaunchTemplate(stack, "LaunchTemplate",
        instance_type=ec2.InstanceType.of(
                         ec2.InstanceClass.BURSTABLE3,
                         ec2.InstanceSize.MICRO),
        machine_image=ecs.EcsOptimizedImage.amazon_linux2023(),
        user_data=ec2.UserData.for_linux(),
        role=iam.Role(stack, "LaunchTemplateRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com")
        )
    )
)

# Create and add capacity provider to the cluster
capacity_provider = ecs.AsgCapacityProvider(stack, "AsgCapacityProvider",
    auto_scaling_group=asg
)
cluster.add_asg_capacity_provider(capacity_provider)

# Define ECS Task Definition
task_definition = ecs.Ec2TaskDefinition(
    stack, "TaskDef")

# Add container to task definition
# Uses sample container image with 256MB memory limit
container = task_definition.add_container(
    "web",
    image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample"),
    memory_limit_mib=256
)


# Expose port 80
port_mapping = ecs.PortMapping(
    container_port=80,
    host_port=0,
    protocol=ecs.Protocol.TCP
)
container.add_port_mappings(port_mapping)

# Create ECS Service using the task definition
service = ecs.Ec2Service(
    stack, "Service",
    cluster=cluster,
    task_definition=task_definition
)

# Create Application Load Balancer
# Internet-facing ALB in the VPC
lb = elbv2.ApplicationLoadBalancer(
    stack, "LB",
    vpc=vpc,
    internet_facing=True
)

# Add ALB listener on port 80
listener = lb.add_listener(
    "PublicListener",
    port=80,
    open=True
)


# Configure health check for target group
health_check = elbv2.HealthCheck(
    interval=Duration.seconds(60),
    path="/health",
    timeout=Duration.seconds(5)
)

# Attach ALB to ECS Service with health check configuration
listener.add_targets(
    "ECS",
    port=80,
    targets=[service],
    health_check=health_check,
)

# Output the ALB DNS name
CfnOutput(
    stack, "LoadBalancerDNS",
    value="http://"+lb.load_balancer_dns_name
)

# Synthesize the stack
app.synth()
