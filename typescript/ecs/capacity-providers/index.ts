import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/core');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-demo-capacity-providers');

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
 * The following service examples all have `desiredCount` set to be an integer. We examine how to satisfy different user
 * stories that leverage capacity providers with a fixed `desiredCount` using the existing CFN API:
 *
 * NOTE: The current behavior of the service if it cannot find spot capacity to place tasks on is to simply fail. For
 * that reason, any specification for placement on spot should not be treated as a guarantee.
 *
 * Case 1: m services split across both spot and on-demand
 * Case 2: m services placed on spot only (100% spot)
 * Case 3: n services first placed on spot, remaining m-n placed on on-demand
 * Case 4: n services first placed on on-demand, remaining m-n placed on spot
 *
 * The case of all m services being placed on on-demand capacity is equivalent to using the fargate launchType without
 * capacity providers at all, so will not be considered in this example.
 */

 // Case 1: m services split across both spot and on-demand
 
const service1 = new ecs.FargateService(stack, 'FargateService-NoBase-EqualWeight', {
  cluster,
  taskDefinition,
  desiredCount: 10,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
    {
      capacityProvider: 'FARGATE',
      weight: 1,
    },
  ],
});

 //  Case 2: Service with Spot weight only
const service2 = new ecs.FargateService(stack, 'FargateService-AllSpot', {
  cluster,
  taskDefinition,
  desiredCount: 10,
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

/*
 * Case 3: n services first placed on spot, remaining m-n placed on on-demand
 * Here, m = 5 and n = 2
 */
const service3 = new ecs.FargateService(stack, 'FargateService-Spot-Base', {
  cluster,
  taskDefinition,
  desiredCount: 5,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      base: 2,
      weight: 0,
    },
    {
      capacityProvider: 'FARGATE',
      weight: 1,
    },
  ],
});

/*
 * Case 4: n services first placed on on-demand, remaining m-n placed on spot
 * Here, m = 5 and n = 2
 */

const service4 = new ecs.FargateService(stack, 'FargateService-OnDemand-Base', {
  cluster,
  taskDefinition,
  desiredCount: 5,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE',
      base: 2, // dedicated
      weight: 0,
    },
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    },
  ],
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
