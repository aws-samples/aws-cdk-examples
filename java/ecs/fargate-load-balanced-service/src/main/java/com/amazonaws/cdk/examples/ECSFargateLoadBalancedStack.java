package com.amazonaws.cdk.examples;

import software.amazon.awscdk.*;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.ec2.VpcProps;
import software.amazon.awscdk.services.ecs.Cluster;
import software.amazon.awscdk.services.ecs.ClusterProps;
import software.amazon.awscdk.services.ecs.ContainerImage;
import software.amazon.awscdk.services.ec2.Peer;
import software.amazon.awscdk.services.ec2.Port;
import software.amazon.awscdk.services.ecs.patterns.NetworkLoadBalancedFargateService;
import software.amazon.awscdk.services.ecs.patterns.NetworkLoadBalancedFargateServiceProps;
import software.amazon.awscdk.services.ecs.patterns.NetworkLoadBalancedTaskImageOptions;
import software.constructs.Construct;

public class ECSFargateLoadBalancedStack extends Stack {

    public ECSFargateLoadBalancedStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSFargateLoadBalancedStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);

        // Create VPC with a AZ limit of two.
        Vpc vpc = new Vpc(this, "MyVpc", VpcProps.builder().maxAzs(2).build());

        // Create the ECS Service
        Cluster cluster = new Cluster(this, "Ec2Cluster", ClusterProps.builder().vpc(vpc).build());

        // Use the ECS Network Load Balanced Fargate Service construct to create a ECS service
        NetworkLoadBalancedFargateService fargateService = new NetworkLoadBalancedFargateService(
                this,
                "FargateService",
                NetworkLoadBalancedFargateServiceProps.builder()
                        .cluster(cluster)
                        .taskImageOptions(NetworkLoadBalancedTaskImageOptions.builder()
                                .image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
                                .build())
                        .build());
        
        // Open port 80 inbound to IPs within VPC to allow network load balancer to connect to the service
        fargateService.getService()
            .getConnections()
            .getSecurityGroups()
            .get(0)
            .addIngressRule(Peer.ipv4(vpc.getVpcCidrBlock()), Port.tcp(80), "allow http inbound from vpc");

        
    }
}
