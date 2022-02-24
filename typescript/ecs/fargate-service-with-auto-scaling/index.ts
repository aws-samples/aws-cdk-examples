import ecs = require('aws-cdk-lib/aws-ecs');
import ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');
import ec2 = require('aws-cdk-lib/aws-ec2');
import cdk = require('aws-cdk-lib');

class AutoScalingFargateService extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a cluster
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, 'fargate-service-autoscaling', { vpc });

    // Create Fargate Service
    const fargateService = new ecs_patterns.NetworkLoadBalancedFargateService(this, 'sample-app', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample")
      },
    });

    // Setup AutoScaling policy
    const scaling = fargateService.service.autoScaleTaskCount({ maxCapacity: 2 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60)
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.loadBalancerDnsName });
  }
}

const app = new cdk.App();

new AutoScalingFargateService(app, 'aws-fargate-application-autoscaling');

app.synth();
