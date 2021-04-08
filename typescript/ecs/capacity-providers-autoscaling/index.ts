import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/core');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-demo-capacity-provider-with-autoscaling');

// Create cluster with FG capacityProviders enabled
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2 });
const cluster = new ecs.Cluster(stack, 'FargateCPCluster', {
  vpc,
  capacityProviders: ['FARGATE', 'FARGATE_SPOT'],
});

// Create task def with sample image
const taskDefinition = new ecs.FargateTaskDefinition(stack, 'TaskDef');
const container = taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  memoryLimitMiB: 256,
});

container.addPortMappings({
  containerPort: 80,
  protocol: ecs.Protocol.TCP
});

/*
 * The following service examples all use Application Autoscaling, with a `minCapacity` and
 * `maxCapacity` used to set `desiredCount` (specified as a range). We examine how to satisfy
 * different user stories that leverage capacity providers with on top of autoscaling using the
 * existing CFN API:
 *
 * NOTE: The current behavior of the service if it cannot find spot capacity to place tasks on is to
 * simply fail. For that reason, any specification for placement on spot should not be treated as a
 * guarantee.
 *
 * We will assume that the range is specified as n:m, where n is the minCapacity and m is the
 * maxCapacity.
 *
 * Case 1: n services placed on on-demand instances, with scaling events triggering placement on
 * spot capacity only
 *
 * Case 1bis: Up to p services placed on on-demand instances (where p >= n), with scaling events
 * triggering placement on spot only
 *
 * Case 2: n services placed on spot instances, with scaling events triggering placement on spot
 * only (i.e. 100% spot)
 *
 * Case 3: n services placed on on-demand instances, with scaling events triggering placement on
 * spot or on-demand (mixed scaling)
 */

 // Case 1: n services placed on on-demand instances, with scaling events triggering placement on spot
const service1 = new ecs.FargateService(stack, 'FargateService-Case1-Scale-Into-Spot', {
  cluster,
  taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
    {
      capacityProvider: 'FARGATE',
      base: 5, // corresponds min of count range
      weight: 0,
    },
  ],
});

// Setup AutoScaling policy
const scaling1 = service1.autoScaleTaskCount({
  minCapacity: 5,
  maxCapacity: 10,
});
scaling1.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 50,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60)
});

// Case 2: n services placed on spot instances, with scaling events triggering placement on spot only (i.e. 100% spot)
const service2 = new ecs.FargateService(stack, 'FargateService-UserStory2a', {
  cluster,
  taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
    {
      capacityProvider: 'FARGATE',
      weight: 0,
    },
  ],
});

// Setup AutoScaling policy
const scaling2 = service2.autoScaleTaskCount({
  minCapacity: 5,
  maxCapacity: 10,
});

scaling2.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 50,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60)
});

/*
 * Case 1bis: Up to p services placed on on-demand instances (where p >= n), with scaling events
 * triggering placement on spot only.
 */
const service3 = new ecs.FargateService(stack, 'FargateService-DedicatedRange', {
  cluster,
  taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
    {
      capacityProvider: 'FARGATE',
      base: 5,
      weight: 0,
    },
  ],
});

const scaling3 = service3.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 10,
});

scaling3.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 50,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60)
});

/*
 * Case 3: n services placed on on-demand instances, with scaling events triggering placement on spot or
 * on-demand (mixed scaling). Here, scaling events would place 50% on spot and 50% on on-demand.
 */
const service4 = new ecs.FargateService(stack, 'FargateService-UserStory3', {
  cluster,
  taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE',
      base: 5,
      weight: 1,
    },
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
  ],
});

const scaling4 = service4.autoScaleTaskCount({
  minCapacity: 5,
  maxCapacity: 10,
});

scaling4.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 50,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60)
});

// Create ALB
const lb = new elb.ApplicationLoadBalancer(stack, 'LB', {
  vpc,
  internetFacing: true
});
const listener = lb.addListener('PublicListener', { port: 80, open: true });

// Attach ALB to ECS Service
listener.addTargets('ECS', {
  port: 80,
  // never actually do this
  targets: [
    service1.loadBalancerTarget({
      containerName: 'web',
      containerPort: 80
    }),
    service2.loadBalancerTarget({
      containerName: 'web',
      containerPort: 80
    }),
    service3.loadBalancerTarget({
      containerName: 'web',
      containerPort: 80
    }),
    service4.loadBalancerTarget({
      containerName: 'web',
      containerPort: 80
    }),
  ],
  // include health check (default is none)
  healthCheck: {
    interval: cdk.Duration.seconds(60),
    path: "/health",
    timeout: cdk.Duration.seconds(5),
  }
});

new cdk.CfnOutput(stack, 'LoadBalancerDNS', { value: lb.loadBalancerDnsName, });
new cdk.CfnOutput(stack, 'cluster', { value: cluster.clusterName, });
new cdk.CfnOutput(stack, 'service1', { value: service1.serviceName, });
new cdk.CfnOutput(stack, 'service2', { value: service2.serviceName, });
new cdk.CfnOutput(stack, 'service3', { value: service3.serviceName, });
new cdk.CfnOutput(stack, 'service4', { value: service4.serviceName, });

app.synth();
