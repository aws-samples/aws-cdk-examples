from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
    core,
)

app = core.App()
stack = core.Stack(app, "aws-ecs-integ-ecs")

# Create a cluster
vpc = ec2.Vpc(
    stack, "Vpc",
    max_azs=2
)

cluster = ecs.Cluster(
    stack, "EcsCluster",
    vpc=vpc
)
cluster.add_capacity("DefaultAutoScalingGroup",
                     instance_type=ec2.InstanceType("t2.micro"))

# Create a task definition with placement constraints
task_definition = ecs.Ec2TaskDefinition(
    stack, "TaskDef",
    placement_constraints=[
        ecs.PlacementConstraint.distinct_instances()
    ]
)

container = task_definition.add_container(
    "web",
    image=ecs.ContainerImage.from_registry("nginx:latest"),
    memory_limit_mib=256,
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
    task_definition=task_definition,
)

service.add_placement_strategies(
    ecs.PlacementStrategy.packed_by(ecs.BinPackResource.MEMORY))
service.add_placement_strategies(
    ecs.PlacementStrategy.spread_across(
        ecs.BuiltInAttributes.AVAILABILITY_ZONE))
app.synth()
