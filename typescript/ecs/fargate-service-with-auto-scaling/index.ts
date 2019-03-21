import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');

class AutoScalingFargateService extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a cluster
    const vpc = new ec2.VpcNetwork(this, 'Vpc', { maxAZs: 2 });
    const cluster = new ecs.Cluster(this, 'fargate-service-autoscaling', { vpc });

    // Create Fargate Service
    const fargateService = new ecs.LoadBalancedFargateService(this, 'sample-app', {
      cluster,
      image: ecs.ContainerImage.fromDockerHub("amazon/amazon-ecs-sample")
    });

    // Setup AutoScaling policy
    const scaling = fargateService.service.autoScaleTaskCount({ maxCapacity: 2 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldownSec: 60,
      scaleOutCooldownSec: 60
    });

    new cdk.Output(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.dnsName, });
  }
}

const app = new cdk.App();

new AutoScalingFargateService(app, 'aws-fargate-application-autoscaling');

app.run();
