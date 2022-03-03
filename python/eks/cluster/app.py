from constructs import Construct
from aws_cdk import (
	App, 
	Stack,
	Tags,
	aws_autoscaling as autoscaling,
	aws_ec2 as ec2,
	aws_eks as eks,
	aws_iam as iam,
	custom_resources as cr,
)

class Stack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        vpc = ec2.Vpc(
            self,
            "Vpc",
            max_azs=3,
            cidr="10.0.0.0/16",
        )

        # it's good to add these tags in case you may want to deploy a Ingress Controller
        for public_subnet in vpc.public_subnets:
            core.Tags.of(public_subnet).add("kubernetes.io/role/elb", "1")

        for private_subnet in vpc.public_subnets:
            core.Tags.of(private_subnet).add("kubernetes.io/role/internal-elb", "1")

        cluster_role = iam.Role(
            self,
            "ClusterRole",
            assumed_by=iam.AccountRootPrincipal(),
            role_name="eks-cluster-masters-role",
        )

        cluster = eks.Cluster(
            self,
            "Cluster",
            masters_role=cluster_role,
            version=eks.KubernetesVersion.V1_21,
            vpc=vpc,
            default_capacity=2,
            default_capacity_instance=ec2.InstanceType("t3.small"),
        )

        nodegroup_role = iam.Role(
            self,
            "NodegroupRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            description="IAM role for added node group capacity",
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    managed_policy_name="AmazonEKSWorkerNodePolicy"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    managed_policy_name="AmazonEC2ContainerRegistryReadOnly"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    managed_policy_name="AmazonEKS_CNI_Policy"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    managed_policy_name="AmazonEKSClusterPolicy"
                ),
            ],
            role_name="nodegroup-capacity-role",
        )

        nodegroup_capacity = cluster.add_nodegroup_capacity(
            "Nodegroup",
            desired_size=1,
            instance_types=[ec2.InstanceType(instance_type_identifier="t3.medium")],
            max_size=5,
            node_role=nodegroup_role,
            nodegroup_name="nodegroup",
        )

        # now we're going to manually apply changes to the auto scaling group attached to the node group
        auto_scaling_group_definition = cr.AwsCustomResource(
            self,
            "NodeGroupASG",
            on_create=cr.AwsSdkCall(
                service="EKS",
                action="describeNodegroup",
                parameters={
                    "clusterName": cluster.cluster_name,
                    "nodegroupName": "nodegroup",
                },
                physical_resource_id=cr.PhysicalResourceId.of("NodegroupASG"),
            ),
            on_update=cr.AwsSdkCall(
                service="EKS",
                action="describeNodegroup",
                parameters={
                    "clusterName": cluster.cluster_name,
                    "nodegroupName": "nodegroup",
                },
                physical_resource_id=cr.PhysicalResourceId.of("NodegroupASG"),
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
        )

        auto_scaling_group_definition.node.add_dependency(nodegroup_capacity)

        auto_scaling_group_name = auto_scaling_group_definition.get_response_field(
            "nodegroup.resources.autoScalingGroups.0.name"
        )

        auto_scaling_group = autoscaling.AutoScalingGroup.from_auto_scaling_group_name(
            self,
            "AdminASG",
            auto_scaling_group_name=auto_scaling_group_name,
        )

        auto_scaling_group.scale_on_cpu_utilization(
            "ASGCpuScaling", target_utilization_percent=70
        )

app = App()
Stack(app, "eks-cluster")

app.synth()