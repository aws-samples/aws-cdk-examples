import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import { InstanceType } from '@aws-cdk/aws-ec2';
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

class ECSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAZs: 2 });

    const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
      instanceType: new InstanceType("t2.xlarge"),
      machineImage: new ecs.EcsOptimizedAmi(),
      updateType: autoscaling.UpdateType.ReplacingUpdate,
      desiredCapacity: 3,
      vpc
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
    cluster.addAutoScalingGroup(asg);

      cluster.addCapacity('DefaultAutoScalingGroup', {
        instanceType: new ec2.InstanceType('t2.micro')
      });

  }
}

const app = new cdk.App();

new ECSCluster(app, 'MyFirstEcsCluster');

app.synth();
