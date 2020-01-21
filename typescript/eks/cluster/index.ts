import autoscaling = require('@aws-cdk/aws-autoscaling');
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import cdk = require('@aws-cdk/core');

class EKSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'EKSVpc');  // Create a new VPC for our cluster
    
    // IAM role for our EC2 worker nodes
    const workerRole = new iam.Role(this, 'EKSWorkerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    const eksCluster = new eks.Cluster(this, 'Cluster', {
      vpc: vpc,
      kubectlEnabled: true,  // we want to be able to manage k8s resources using CDK
      defaultCapacity: 0  // we want to manage capacity our selves
    });

    const onDemandASG = new autoscaling.AutoScalingGroup(this, 'OnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 10,
      instanceType: new ec2.InstanceType('t3.medium'),
      machineImage: new eks.EksOptimizedImage({
        kubernetesVersion: '1.14',
        nodeType: eks.NodeType.STANDARD  // wihtout this, incorrect SSM parameter for AMI is resolved
      }),
      updateType: autoscaling.UpdateType.ROLLING_UPDATE
    });

    eksCluster.addAutoScalingGroup(onDemandASG, {});
  }
}

const app = new cdk.App();
new EKSCluster(app, 'MyEKSCluster');
app.synth();
