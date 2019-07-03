import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/core');

class ECSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAZs: 2 });

    const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.XLARGE),
      machineImage: new ecs.EcsOptimizedAmi(),
      updateType: autoscaling.UpdateType.REPLACING_UPDATE,
      desiredCapacity: 3,
      vpc,
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
    cluster.addAutoScalingGroup(asg);

    /**
     * This lines seem to break the synth with the following error:
     * Error: There is already a Construct with name 'SsmParameterValue:/aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id:C96584B6-F00A-464E-AD19-53AFF4B05118.Parameter' in ECSCluster [MyFirstEcsCluster]
     * This will be investigated and code will be left for now. This will break build however. 
     */

    cluster.addCapacity('DefaultAutoScalingGroup', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO)
    });
  }
}

const app = new cdk.App();

new ECSCluster(app, 'MyFirstEcsCluster');

app.synth();
