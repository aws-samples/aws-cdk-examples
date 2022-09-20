import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import { Stack, StackProps, App } from 'aws-cdk-lib';
import { SplitAtListener_LoadBalancerStack, SplitAtListener_ServiceStack } from './split-at-listener';
import { SplitAtTargetGroup_LoadBalancerStack, SplitAtTargetGroup_ServiceStack } from './split-at-targetgroup';
import { Construct } from 'constructs';

/**
 * Shared infrastructure -- VPC and Cluster
 */
class SharedInfraStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc
    });
  }
}

const app = new App();

const infra = new SharedInfraStack(app, 'CrossStackLBInfra');

// Demo that splits at Listener
const splitAtListenerLBStack = new SplitAtListener_LoadBalancerStack(app, 'SplitAtListener-LBStack', {
  vpc: infra.vpc,
});
new SplitAtListener_ServiceStack(app, 'SplitAtListener-ServiceStack', {
  cluster: infra.cluster,
  vpc: infra.vpc,
  loadBalancer: splitAtListenerLBStack.loadBalancer
});

// Demo that splits at Target Group
const splitAtTargetGroupLBStack = new SplitAtTargetGroup_LoadBalancerStack(app, 'SplitAtTargetGroup-LBStack', {
  vpc: infra.vpc,
});
new SplitAtTargetGroup_ServiceStack(app, 'SplitAtTargetGroup-ServiceStack', {
  cluster: infra.cluster,
  vpc: infra.vpc,
  targetGroup: splitAtTargetGroupLBStack.targetGroup
});

app.synth();
