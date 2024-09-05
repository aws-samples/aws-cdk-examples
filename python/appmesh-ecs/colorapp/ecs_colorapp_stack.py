from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import aws_cdk as core
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_servicediscovery as servicediscovery
import aws_cdk.aws_elasticloadbalancingv2 as elbv2
import aws_cdk.aws_ec2 as ec2
class ColorAppStack(Stack):
    def  create_color_discovery_record(self, color, namespace):
        environment_name ="appmesh-env"
        return servicediscovery.Service(
            self, f"ColorTeller{color}ServiceDiscoveryRecord",
            name=f"colorteller-{color}-service",
            namespace=namespace,
            dns_record_type=servicediscovery.DnsRecordType.A,
            dns_ttl=core.Duration.seconds(30),
            custom_health_check=servicediscovery.HealthCheckCustomConfig(failure_threshold=1)


        )
    def create_color_service(self, color, dr):
        environment_name ="appmesh-env"
        task_definition_arn = core.Fn.import_value(f"{environment_name}:ColorTellerTaskDefinitionArn-{color}")
        task_definition = ecs.TaskDefinition.from_task_definition_arn(self, f"ColorTeller{color}TaskDefinition", task_definition_arn=task_definition_arn)
        return ecs.FargateService(
            self, f"ColorTeller{color}Service",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name=f'colorteller-{color}-service',
            desired_count=1,
            max_healthy_percent=200,
            min_healthy_percent=100,
            task_definition=task_definition,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            assign_public_ip=False,
            security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")],
            cloud_map_options=ecs.CloudMapOptions(cloud_map_namespace=dr)
        )
    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        colors = ["blue", "red", "black"]
        namespace = servicediscovery.PrivateDnsNamespace.from_private_dns_namespace_attributes(self, "Namespace",
                                                                                                namespace_arn=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceARN"), 
                                                                                                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                                                                                                namespace_name=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceName"))   
        for color in colors:
            dr = self.create_color_discovery_record(color, namespace)

            service = self.create_color_service(color, dr)
        
        ColorTellerWhiteServiceDiscoveryRecord = servicediscovery.Service(
            self, "ColorTellerWhiteServiceDiscoveryRecord",
            name="colorteller",
            namespace=namespace,
            dns_record_type=servicediscovery.DnsRecordType.A,
            dns_ttl=core.Duration.seconds(30),
            custom_health_check=servicediscovery.HealthCheckCustomConfig(failure_threshold=1)


        )
        colorColorTellerWhiteService = self.create_color_service('white', ColorTellerWhiteServiceDiscoveryRecord)
