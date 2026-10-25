package com.myorg;

import software.constructs.Construct;

import java.util.List;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.Instance;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.MachineImage;
import software.amazon.awscdk.services.ec2.SubnetConfiguration;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;

public class Ec2InstanceStack extends Stack {
    public Ec2InstanceStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public Ec2InstanceStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

      // Create a new VPC
      Vpc vpc = Vpc.Builder.create(this, "Vpc")
        .natGateways(0)
        .subnetConfiguration(List.of(SubnetConfiguration.builder()
          .name("public")
          .subnetType(SubnetType.PUBLIC)
          .build()))
        .build();

      // Instance Role
      Role role = Role.Builder.create(this, "InstanceRole")
        .assumedBy(new ServicePrincipal("ec2.amazonaws.com"))
      .build();

      // Add SSM Managed Policy
      role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

      // Launch an EC2 instance in the VPC
      Instance instance = Instance.Builder.create(this, "Ec2Instance")
        .instanceType(new InstanceType("t3.nano"))
        .machineImage(MachineImage.latestAmazonLinux2023())
        .role(role)
        .vpc(vpc)
        .build();

      // Add User Data commands
      instance.addUserData("echo \"Hello World.\"");

    }
}
