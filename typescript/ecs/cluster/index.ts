import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import { InstanceType } from '@aws-cdk/aws-ec2';
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

class ECSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.VpcNetwork(this, 'MyVpc', { maxAZs: 2 });

    const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
      instanceType: new InstanceType("t2.xlarge"),
      machineImage: new ec2.AmazonLinuxImage(),
      associatePublicIpAddress: true,
      updateType: autoscalingUpdateType.ReplacingUpdate,
      desiredCapacity: 3,
      vpc
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
    cluster.addAutoScalingGroupCapacity(asg);
  }
}

const app = new cdk.App();

new ECSCluster(app, 'MyFirstEcsCluster');

app.run();

