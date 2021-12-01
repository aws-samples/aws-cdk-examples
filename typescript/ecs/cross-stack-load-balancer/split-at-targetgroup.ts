import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';


//---------------------------------------------------------------------------
//  Load balancer stack

export interface SplitAtTargetGroup_LoadBalancerStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class SplitAtTargetGroup_LoadBalancerStack extends Stack {
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: SplitAtTargetGroup_LoadBalancerStackProps) {
    super(scope, id, props);

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true
    });

    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: props.vpc,
      port: 80,
    });

    loadBalancer.addListener('Listener', {
      port: 80,
      defaultTargetGroups: [this.targetGroup]
    });

    new CfnOutput(this, 'LoadBalancerDNS', { value: loadBalancer.loadBalancerDnsName, });
  }
}

//---------------------------------------------------------------------------
//  Service stack

export interface SplitAtTargetGroup_ServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  targetGroup: elbv2.IApplicationTargetGroup;
}

export class SplitAtTargetGroup_ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: SplitAtTargetGroup_ServiceStackProps) {
    super(scope, id, props);

    // Standard ECS service setup
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');
    const container = taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      memoryLimitMiB: 256,
    });

    container.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP
    });

    const service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition,
    });

    // Connect service to TargetGroup
    // NOTE: This does not introduce a cycle because ECS Services are self-registering
    // (they point to the TargetGroup instead of the other way around).
    props.targetGroup.addTarget(service);
  }
}
