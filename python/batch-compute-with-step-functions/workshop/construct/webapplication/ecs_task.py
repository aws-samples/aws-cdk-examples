from aws_cdk import (
    aws_ecs as _ecs,
    aws_iam as _iam,
    aws_ec2 as _ec2,
    aws_elasticloadbalancingv2 as _elbv2,
    core,
)

class EcsTASK(core.Construct):
    def getFargateService(self,ServiceName):
        return self.FargateServiceList[ServiceName]
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",Repo="default",Vpc="default",Cluster="default",APIGateway="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.FargateServiceList = {}
        self.LoadBalancer = {}
        
        self.fargate_task_execution_role = _iam.Role(
            self, 'TaskExecutionRole',
            assumed_by=_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AmazonECSTaskExecutionRolePolicy'),
                _iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess")
            ]
        )
        
        self.fargate_task_role = _iam.Role(
            self, 'fargate_task_role',
            assumed_by=_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managed_policies=[
                _iam.ManagedPolicy.from_aws_managed_policy_name('AmazonAPIGatewayInvokeFullAccess')
            ]
        )

        self.Fargate_Web = _ecs.FargateTaskDefinition(
            self, 'Fargate_Web',
            family="Fargate_Web_" + UserName,
            memory_limit_mib=512,
            cpu=256,
            execution_role=self.fargate_task_execution_role,
            task_role=self.fargate_task_role
        )
        
        self.Fargate_Web_Container = self.Fargate_Web.add_container(
            'Fargate_Web_Container_' + UserName,
            image=_ecs.ContainerImage.from_registry("nginx"),
            environment = {
                "APIGatewayURL":APIGateway.getAPIGateway("SubmitForm").url
            }
        ).add_port_mappings(
            _ecs.PortMapping(container_port=80)
        )
        
        self.Web_Application_Service = _ecs.FargateService(
            self, 'WebApplicationService',
            cluster=Cluster,
            task_definition=self.Fargate_Web,
            desired_count=2,
            min_healthy_percent=50,
            max_healthy_percent=200
        )
        self.FargateServiceList["WebApplicationService"] = self.Web_Application_Service
        
        self.Web_Application_Service.connections.security_groups[0].add_ingress_rule(
            peer=_ec2.Peer.any_ipv4(),
            connection=_ec2.Port.tcp(80),
            description="Allow http inbound from VPC"
        )
        
        self.Web_Application_ServiceALB = _elbv2.ApplicationLoadBalancer(
            self,
            "Web_Application_ServiceALB",
            internet_facing=True,
            vpc=Vpc
        )
        self.Web_Application_ServiceALB_Listener = self.Web_Application_ServiceALB.add_listener(
            "Web_Application_ServiceALB_Listener",
            port=80,
            protocol=_elbv2.ApplicationProtocol.HTTP
        ).add_targets(
            "Web_Application_ServiceALB_Listener",
            deregistration_delay=core.Duration.seconds(1),
            port=80,
            targets=[
                self.Web_Application_Service.load_balancer_target(
                    container_name="Fargate_Web_Container_" + UserName,
                    container_port=80
                )
            ],
            health_check=_elbv2.HealthCheck(
                healthy_threshold_count=2,
                unhealthy_threshold_count=2,
                timeout=core.Duration.seconds(10)
            )
        )
        
        self.LoadBalancer["WebApplicationService"] = self.Web_Application_ServiceALB
        
        core.CfnOutput(self,
            "LoadBalancerDNS",
            value = self.Web_Application_ServiceALB.load_balancer_dns_name
        )