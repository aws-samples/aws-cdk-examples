#!/usr/bin/env python3
import base64
from aws_cdk import (
    aws_autoscaling as autoscaling,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_certificatemanager as acm,
    App, CfnOutput, Stack
)


class LoadBalancerStack(Stack):
    def __init__(self, app: App, id: str) -> None:
        super().__init__(app, id)

        # Create a VPC for our infrastructure
        vpc = ec2.Vpc(self, "VPC")

        # Read and prepare user data script for EC2 instances
        data = open("./httpd.sh", "rb").read()
        httpd=ec2.UserData.for_linux()
        httpd.add_commands(str(data,'utf-8'))

        # Create an Auto Scaling Group with EC2 instances
        asg = autoscaling.AutoScalingGroup(
            self,
            "ASG",
            vpc=vpc,
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO
            ),
            machine_image=ec2.AmazonLinuxImage(generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2),
            user_data=httpd,
        )

        # Create an Application Load Balancer
        lb = elbv2.ApplicationLoadBalancer(
            self, "LB",
            vpc=vpc,
            internet_facing=True)

        # Create HTTP listener with redirect
        http_listener = lb.add_listener(
            "HttpListener", 
            port=80,
            default_action=elbv2.ListenerAction.redirect(
                port="443",
                protocol="HTTPS",
                permanent=True,
                host="#{host}",
                path="/#{path}",
                query="#{query}"
            )
        )

        # Create HTTPS listener
        https_listener = lb.add_listener(
            "HttpsListener",
            port=443,
            certificates=[elbv2.ListenerCertificate.from_arn("certificate_arn")],
            ssl_policy=elbv2.SslPolicy.RECOMMENDED
        )

        # Add target group to HTTPS listener
        https_listener.add_targets("Target", port=80, targets=[asg])
        https_listener.connections.allow_default_port_from_any_ipv4("Open to the world")

        # Configure Auto Scaling based on request count
        asg.scale_on_request_count("AModestLoad", target_requests_per_minute=60)
        
        # Output the Load Balancer DNS name
        CfnOutput(self,"LoadBalancer",export_name="LoadBalancer",value=lb.load_balancer_dns_name)


# Initialize the CDK app and create the stack
app = App()
LoadBalancerStack(app, "LoadBalancerStack")
app.synth()
