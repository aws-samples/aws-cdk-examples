package com.amazonaws.cdk;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.*;
import software.constructs.Construct;

import java.util.List;

public class VpcStack extends Stack {

    private final IVpc vpc;

    public VpcStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public VpcStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        final List<SubnetConfiguration> subnets = List.of(SubnetConfiguration.builder()
                        .name("EksPublic")
                        .subnetType(SubnetType.PUBLIC)
                        .cidrMask(24)
                        .build(),
                SubnetConfiguration.builder()
                        .name("EksPrivate")
                        .subnetType(SubnetType.PRIVATE_WITH_EGRESS)
                        .cidrMask(20)
                        .build());

        this.vpc = Vpc.Builder.create(this, "vpc")
                .vpcName("eks-vpc")
                .maxAzs(3)
                .createInternetGateway(true)
                .enableDnsHostnames(true)
                .enableDnsSupport(true)
                .ipAddresses(IpAddresses.cidr("10.0.0.0/16"))
                .natGateways(1)
                .subnetConfiguration(subnets)
                .build();

        CfnOutput.Builder.create(this, "vpc-id")
                .value(this.vpc.getVpcId())
                .build();

        CfnOutput.Builder.create(this, "vpc-public-subnets")
                .value(this.vpc.getPublicSubnets()
                        .stream()
                        .map(ISubnet::getSubnetId)
                        .reduce((a, b) -> a + "," + b)
                        .orElse("")
                )
                .build();

        CfnOutput.Builder.create(this, "vpc-private-subnets")
                .value(this.vpc.getPrivateSubnets()
                        .stream()
                        .map(ISubnet::getSubnetId)
                        .reduce((a, b) -> a + "," + b)
                        .orElse("")
                )
                .build();
    }

    public IVpc getVpc() {
        return this.vpc;
    }

}
