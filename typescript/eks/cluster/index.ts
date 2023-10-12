import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { KubectlLayer } from 'aws-cdk-lib/lambda-layer-kubectl';

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
      defaultCapacity: 0,  // we want to manage capacity our selves
      version: eks.KubernetesVersion.V1_27,
      kubectlLayer: new KubectlLayer(this, 'KubectlLayer'),
    });

    const onDemandASG = new autoscaling.AutoScalingGroup(this, 'OnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 10,
      allowAllOutbound: false,
      instanceType: new ec2.InstanceType('t3.medium'),
      machineImage: new eks.EksOptimizedImage({
        kubernetesVersion: eks.KubernetesVersion.V1_27.version,
        nodeType: eks.NodeType.STANDARD  // without this, incorrect SSM parameter for AMI is resolved
      }),
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate()
      });

    eksCluster.connectAutoScalingGroupCapacity(onDemandASG, {});
  }
}

const app = new cdk.App();
new EKSCluster(app, 'MyEKSCluster');
app.synth();
