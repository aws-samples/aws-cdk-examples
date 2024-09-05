import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_autoscaling as autoscaling
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk as core
import aws_cdk.aws_ssm as ssm
import aws_cdk.aws_iam as iam
import aws_cdk.aws_logs as logs
import aws_cdk.aws_servicediscovery as servicediscovery
class ECSStack(Stack):

   def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        vpc = ec2.Vpc(self, "AppMeshVPC",
                    ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
                    create_internet_gateway=True,
                    max_azs=2,
                    nat_gateways=2,
                    enable_dns_hostnames=True,
                    enable_dns_support=True,
                    vpc_name="App-Mesh-VPC",
                    subnet_configuration=[
                        ec2.SubnetConfiguration(
                            subnet_type=ec2.SubnetType.PUBLIC,
                            name="Public",
                            cidr_mask=24
                        ),
                        ec2.SubnetConfiguration(
                            subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                            name="Private",
                            cidr_mask=24
                        )
                    ]
                    )
        
        
        AWSRegion=core.Stack.of(self).region
        AWSStackId=core.Stack.of(self).stack_id
        # The following creates the ECS Cluster along with its security groups. It also creates the proper roles that the ECS tasks will assume
        # as well as the log group that the tasks log to and the service discovery namespace (created under AWS Cloud Map in the console)
        ecsCluster = ecs.Cluster(self, "ecsCluster", 
                                  cluster_name="App-Mesh-ECS-Cluster",
                                  vpc=vpc
                                  
                                  ) 
        
        ECSServiceDiscoveryNamespace = servicediscovery.PrivateDnsNamespace(self, "ServiceDiscoveryNamespace",
                                                                           name="appmesh.local",
                                                                           vpc=vpc
                                                                           )
        ECSServiceLogGroup = logs.LogGroup(self, "ECSServiceLogGroup",
                                           log_group_name=f"{ecsCluster.cluster_name}-service",
                                           removal_policy=core.RemovalPolicy.DESTROY,
                                           retention=logs.RetentionDays.FIVE_DAYS,
                                           )
        ECSTaskIamRole = iam.Role(self, "ECSTaskIamRole",
                                   assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                                   managed_policies=[
                                       iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchFullAccess"),
                                       iam.ManagedPolicy.from_aws_managed_policy_name("AWSAppMeshEnvoyAccess"),
                                       iam.ManagedPolicy.from_aws_managed_policy_name("AWSXRayDaemonWriteAccess"),
                                   ],
                                   )
        TaskExecutionRole = iam.Role(self, "TaskexecutionRole",
                                      assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                                      managed_policies=[
                                          iam.ManagedPolicy.from_aws_managed_policy_name("AmazonEC2ContainerRegistryReadOnly"),
                                          iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess"),
                                      ],
                                      )
        ECSSecurityGroup = ec2.SecurityGroup(self, "ECSSecurityGroup",
                                              vpc=vpc,
                                              description="ECS Security Group",
                                              allow_all_outbound=True,
                                              )
        ECSSecurityGroup.add_ingress_rule(peer=ec2.Peer.ipv4(vpc.vpc_cidr_block), connection=ec2.Port.all_traffic(), description="allow any from LAN")
        vpc_id_ssm_store = ssm.StringParameter(self, "vpcid", parameter_name="vpc_id", string_value=vpc.vpc_id)
        core.CfnOutput(
            self, "ECSCluster",
            value=ecsCluster.cluster_name,
            export_name=f"{environment_name}:ECSCluster"
        )
        core.CfnOutput(
            self, "ECSClusterARN",
            value=ecsCluster.cluster_arn,
            export_name=f"{environment_name}:ECSClusterARN"
        )

        core.CfnOutput(
            self, "ECSServiceDiscoveryNamespace",
            value=ECSServiceDiscoveryNamespace.namespace_name,
            export_name=f"{environment_name}:ECSServiceDiscoveryNamespace"
        )
        core.CfnOutput(
            self, "ECSServiceDiscoveryNamespaceARN",
            value=ECSServiceDiscoveryNamespace.namespace_arn,
            export_name=f"{environment_name}:ECSServiceDiscoveryNamespaceARN"
        )
        core.CfnOutput(
            self, "ECSServiceDiscoveryId",
            value=ECSServiceDiscoveryNamespace.namespace_id,
            export_name=f"{environment_name}:ECSServiceDiscoveryNamespaceID"
        )
        core.CfnOutput(
            self, "ECSServicelogGroup",
            value=ECSServiceLogGroup.log_group_name,
            export_name=f"{environment_name}:ECSServicelogGroupName"
        )
        core.CfnOutput(
            self, "ECSServicelogGroupARN",
            value=ECSServiceLogGroup.log_group_arn,
            export_name=f"{environment_name}:ECSServicelogGroupARN"
        )
        core.CfnOutput(self, "ECSServiceSecurityGroup",
            value=ECSSecurityGroup.security_group_id,
            export_name=f"{environment_name}:ECSServiceSecurityGroup")
        
        core.CfnOutput(
            self, "Task_Execution_Iam_Role",
            value=TaskExecutionRole.role_arn,
            export_name=f"{environment_name}:TaskExecutionIamRole"
        )

        core.CfnOutput(
            self, "ECS_Task_Iam_Role",
            value=ECSTaskIamRole.role_arn,
            export_name=f"{environment_name}:ECSTaskIamRole"
        )
        core.CfnOutput(
            self, "VPCID",
            value=vpc.vpc_id,
            export_name=f"{environment_name}:VPCID"
        )
        core.CfnOutput(
            self, "VpcAvailabilityZones",
            value=core.Fn.join(',', vpc.availability_zones),
            export_name=f"{environment_name}:VpcAvailabilityZones"
        )
        private_subnet_ids = [subnet.subnet_id for subnet in vpc.private_subnets]
        core.CfnOutput(self, "PrivateSubnetIds",
            value=core.Fn.join(',', private_subnet_ids),
            export_name=f"{environment_name}:MyPrivateSubnetIds"
        )
        public_subnet_ids = [subnet.subnet_id for subnet in vpc.public_subnets]
        core.CfnOutput(self, "PublicSubnetIds",
            value=core.Fn.join(',', public_subnet_ids),
            export_name=f"{environment_name}:MyPublicSubnetIds"
        )
        core.CfnOutput(
            self, "Public Subnet 1",
            value=vpc.public_subnets[0].subnet_id,
            export_name=f"{environment_name}:PublicSubnet1"
        )
        core.CfnOutput(
            self, "Public Subnet 2",
            value=vpc.public_subnets[1].subnet_id,
            export_name=f"{environment_name}:PublicSubnet2"
        )
        core.CfnOutput(
            self, "Private Subnet 1",
            value=vpc.private_subnets[0].subnet_id,
            export_name=f"{environment_name}:PrivateSubnet1"
        )
        core.CfnOutput(
            self, "Private Subnet 2",
            value=vpc.private_subnets[1].subnet_id,
            export_name=f"{environment_name}:PrivateSubnet2"
        )
        core.CfnOutput(self, "VpcCidr", 
            value=vpc.vpc_cidr_block,
            export_name=f"{environment_name}:VpcCidr"
        )