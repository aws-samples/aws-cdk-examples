import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');

class ECSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });

    const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.XLARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      desiredCapacity: 3,
      vpc,
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup: asg });
    cluster.addAsgCapacityProvider(capacityProvider);
  }
}

const app = new cdk.App();

new ECSCluster(app, 'MyFirstEcsCluster');

app.synth();
