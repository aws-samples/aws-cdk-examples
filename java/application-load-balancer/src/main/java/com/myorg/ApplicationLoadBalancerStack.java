package com.myorg;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.autoscaling.RequestCountScalingProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.elasticloadbalancingv2.AddApplicationTargetsProps;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationListenerProps;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancer;
import software.constructs.Construct;

import java.util.List;

public class ApplicationLoadBalancerStack extends Stack {

  // This user data string is required to deploy a nginx web server to each EC2 instance created.
  // A simple web page that displays the host name of the EC2 instance is also deployed to nginx.
  // This is useful to check if the ALB created sends requests to different EC2 instances by observing the hostname displayed.
  private static final String USER_DATA_CONTENT_NGINX = """
    #!/bin/bash
    dnf -y upgrade
    dnf -y install nginx
    systemctl start nginx
    systemctl enable nginx
    rm -rfv /usr/share/nginx/html/ && mkdir /usr/share/nginx/html/
    echo "<h1>Hello world from $(hostname -f)</h1>" > /usr/share/nginx/html/index.html
    """;

  public ApplicationLoadBalancerStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
    var vpc = Vpc.Builder.create(this, "VPC")
      .restrictDefaultSecurityGroup(false)
      .build();
    var amazonLinuxImage = AmazonLinuxImage.Builder.create()
      .generation(AmazonLinuxGeneration.AMAZON_LINUX_2023)
      .cpuType(AmazonLinuxCpuType.ARM_64)
      .userData(UserData.custom(USER_DATA_CONTENT_NGINX))
      .build();
    var autoScalingGroup = AutoScalingGroup.Builder.create(this, "ASG")
      .vpc(vpc)
      .instanceType(InstanceType.of(InstanceClass.BURSTABLE4_GRAVITON, InstanceSize.MICRO))
      .machineImage(amazonLinuxImage)
      // Change the desired capacity (default value of 1) so that 2 EC2 instances are created initially instead of one.
      // This way the ALB will route requests between both instances right away making it easier to test load balancing functionality.
      .desiredCapacity(2)
      .maxCapacity(3)
      .minCapacity(1)
      .build();
    var applicationLoadBalancer = ApplicationLoadBalancer.Builder.create(this, "LB")
      .vpc(vpc)
      .loadBalancerName("LB")
      .internetFacing(Boolean.TRUE)
      .build();
    var applicationListenerProps = ApplicationListenerProps.builder()
      .port(80)
      .loadBalancer(applicationLoadBalancer)
      .build();
    var applicationListener = applicationLoadBalancer.addListener("Listener", applicationListenerProps);
    var addApplicationTargetsProps = AddApplicationTargetsProps.builder()
      .port(80)
      .targets(List.of(autoScalingGroup))
      .build();
    applicationListener.addTargets("Target", addApplicationTargetsProps);
    applicationListener.getConnections().allowDefaultPortFromAnyIpv4("Open to the world");
    var requestCountScalingProps = RequestCountScalingProps.builder()
      .targetRequestsPerMinute(60)
      .build();
    // This is an example on how to create a dynamic target tracking scaling policy.
    // This is based on the ALB request count per target, but it is more difficult to test.
    // The dynamic scaling policy should show up though in the AWS Management Console for the ASG created.
    autoScalingGroup.scaleOnRequestCount("AModestLoad", requestCountScalingProps);
    CfnOutput.Builder.create(this, "ApplicationLoadBalancerURL")
      .value(applicationListener.getLoadBalancer().getLoadBalancerDnsName())
      .description("The DNS of the application load balancer.")
      .build();
  }
}
