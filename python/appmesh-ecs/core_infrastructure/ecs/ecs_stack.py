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
        
        AWSRegion=core.Stack.of(self).region
        AWSStackId=core.Stack.of(self).stack_id
        # The following creates the ECS Cluster along with its security groups. It also creates the proper roles that the ECS tasks will assume
        # as well as the log group that the tasks log to and the service discovery namespace (created under AWS Cloud Map in the console)
        ecsCluster = ecs.CfnCluster(
            self, "ecsCluster",
            cluster_name="App-Mesh-ECS-Cluster",
            capacity_providers=["FARGATE"],
            default_capacity_provider_strategy=[{"capacityProvider": "FARGATE", "weight": 1, "base": 1}],
        )
        ecsSGG = ec2.CfnSecurityGroup(
            self, "ECS_SG",
            group_description="Security Group for ECS instances",
            vpc_id=core.Fn.import_value(f"{environment_name}:VPCID"),
            group_name="ecs-sg",
            security_group_ingress=[
                ec2.CfnSecurityGroup.IngressProperty(
                    cidr_ip=core.Fn.import_value(f"{environment_name}:VpcCidr"),
                    ip_protocol="-1"
                    # ip protocol -1? not sure
                    # ip_protocol="tcp",
                    # from_port=8080,
                    # to_port=8080
                )
            ],
            
        )
        ECSServiceSecurityGroup = ec2.CfnSecurityGroup(
            self, "ECSSecurityGroup",
            group_name="ecs-service-sg",
            group_description="Security group for ECS service",
            vpc_id=core.Fn.import_value(f"{environment_name}:VPCID"),
            security_group_ingress=[
                ec2.CfnSecurityGroup.IngressProperty(
                    cidr_ip=core.Fn.import_value(f"{environment_name}:VpcCidr"),
                
                    ip_protocol="-1",
                    # from_port=8080,
                    # to_port=8080
                )
            ]
        )
        ECSTaskIamRole = iam.CfnRole(
            self, "ECSTaskIamRole",
            role_name="TaskIamRole",
            assume_role_policy_document={
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": [
                                "ecs-tasks.amazonaws.com"
                            ]
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            },
            managed_policy_arns=[
                "arn:aws:iam::aws:policy/CloudWatchFullAccess",
                "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
                "arn:aws:iam::aws:policy/AWSAppMeshEnvoyAccess"
            ]
            
        )
        TaskExecutionIamRole = iam.CfnRole(
            self, "TaskExecutionIamRole",
            role_name="ecs-task-execution-role",
            assume_role_policy_document={
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": [
                                "ecs-tasks.amazonaws.com"
                            ]
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            },
            managed_policy_arns=[
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
                "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
            ]
        )
        ECSServicelogGroup = logs.CfnLogGroup(
            self, "ECSServiceLogGroup",
            log_group_name=f"{ecsCluster.cluster_name}-service",
            retention_in_days=7
        )
        ECSServiceDiscoveryNamespace = servicediscovery.CfnPrivateDnsNamespace(
            self, "ServiceDiscoveryNamespace",
            name="appmesh.local",
            vpc=core.Fn.import_value(f"{environment_name}:VPCID")
        )

        core.CfnOutput(
            self, "ECSCluster",
            value=ecsCluster.ref,
            export_name=f"{environment_name}:ECSCluster"
        )

        core.CfnOutput(
            self, "ECSServiceDiscoveryNamespace",
            value=ECSServiceDiscoveryNamespace.name,
            export_name=f"{environment_name}:ECSServiceDiscoveryNamespace"
        )
        core.CfnOutput(
            self, "ECSServiceDiscoveryId",
            value=ECSServiceDiscoveryNamespace.attr_id,
            export_name=f"{environment_name}:ECSServiceDiscoveryNamespaceID"
        )
        core.CfnOutput(
            self, "ECSServicelogGroup",
            value=ECSServicelogGroup.ref,
            export_name=f"{environment_name}:ECSServicelogGroup"
        )
        core.CfnOutput(self, "ECSServiceSecurityGroup",
            value=ECSServiceSecurityGroup.ref,
            export_name=f"{environment_name}:ECSServiceSecurityGroup")
        
        core.CfnOutput(
            self, "Task_Execution_Iam_Role",
            value=TaskExecutionIamRole.attr_arn,
            export_name=f"{environment_name}:TaskExecutionIamRole"
        )

        core.CfnOutput(
            self, "ECS_Task_Iam_Role",
            value=ECSTaskIamRole.attr_arn,
            export_name=f"{environment_name}:ECSTaskIamRole"
        )

        # core.CfnOutput(
        #     self, "BastionHostId",
        #     value=BastionHost.ref,
        #     export_name=f"{environment_name}:BastionHostId"
        # )
        # core.CfnOutput(
        #     self, "BastionHostPublicIp",
        #     value=BastionHost.attr_public_ip,
        #     export_name=f"{environment_name}:BastionHostPublicIp"
        # )