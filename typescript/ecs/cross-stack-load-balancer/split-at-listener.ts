import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';


//---------------------------------------------------------------------------
//  Load balancer stack

export interface SplitAtListener_LoadBalancerStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class SplitAtListener_LoadBalancerStack extends Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: SplitAtListener_LoadBalancerStackProps) {
    super(scope, id, props);

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true
    });

    new CfnOutput(this, 'LoadBalancerDNS', { value: this.loadBalancer.loadBalancerDnsName, });
  }
}

//---------------------------------------------------------------------------
//  Service stack

export interface SplitAtListener_ServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  loadBalancer: elbv2.IApplicationLoadBalancer;
}

export class SplitAtListener_ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: SplitAtListener_ServiceStackProps) {
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

    // Create a new listener in the current scope, add targets to it
    const listener = new elbv2.ApplicationListener(this, 'Listener', {
      loadBalancer: props.loadBalancer, // ! need to pass load balancer to attach to !
      port: 80,
    });

    listener.addTargets('ECS', {
      port: 80,
      targets: [service],
    });
  }
}
