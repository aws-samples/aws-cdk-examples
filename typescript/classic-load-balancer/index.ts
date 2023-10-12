#!/usr/bin/env node
import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elb = require('aws-cdk-lib/aws-elasticloadbalancing');
import cdk = require('aws-cdk-lib');

class LoadBalancerStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const vpc = new ec2.Vpc(this, 'VPC');

    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      })
    });

    const lb = new elb.LoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true,
      healthCheck: {
        port: 80
      },
    });

    lb.addTarget(asg);
    const listener = lb.addListener({ externalPort: 80 });

    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
  }
}

const app = new cdk.App();
new LoadBalancerStack(app, 'LoadBalancerStack');
app.synth();
