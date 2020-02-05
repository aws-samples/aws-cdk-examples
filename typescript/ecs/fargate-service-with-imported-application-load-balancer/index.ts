import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import {Stack} from '@aws-cdk/core';

const stack = new Stack();
// take care of importing all required constructs 
const vpc = ec2.Vpc.fromLookup(stack, "vpc", {vpcId: "my-vpc-id"});
const lbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(stack, "sgId", "my-alb-sg-id");
const importedCluster = ecs.Cluster.fromClusterAttributes(stack, "clusterImport", {
  clusterName: "my-cluster",
  vpc,
  securityGroups: [ec2.SecurityGroup.fromSecurityGroupId(stack, "sg", "other-service-sg")], //and other security groups on the cluster
});
const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(stack, "Listener", {
  listenerArn: "my-application-listener-arn",
  securityGroup: lbSecurityGroup,
});
const alb = elbv2.ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(stack, "loadBalancer", {
  loadBalancerArn: "my-alb-arn",
  securityGroupId: "my-alb-sg-id", 
  securityGroupAllowsAllOutbound: false,
});

// create our task definition, container, and add port mappings
const taskDefinition = new ecs.FargateTaskDefinition(stack, "TD2");
const container = taskDefinition.addContainer("Service2Container", {
  image: ecs.ContainerImage.fromRegistry("nginx"),
  environment: {"MY_ENVIRONMENT_VAR": "foo"},
  memoryLimitMiB: 512,
  cpu: 256
});
container.addPortMappings({containerPort: 80})

// Create a service -- this instance isn't particularly complex, since we only have
// one container image per service that we need to worry about. 
// We'll reuse the cluster from our first service but use our newly created 
// security group for this purpose. 
const service2 = new ecs.FargateService(stack, "service2", {
  cluster: importedCluster,
  taskDefinition
});

// Set up security group ingress/egress between LB and new service
service2.connections.allowFrom(alb, ec2.Port.tcp(80));
alb.connections.allowTo(service2, ec2.Port.tcp(80));
// Allow connections between services if necessary. This would require importing
// any other service by attributes and ensuring that you specify its security group when
// importing the cluster. 

// Create a new target group for the service and add it to the listener, specifying
// a path, host, or IP pattern and a priority. 
const tg = new elbv2.ApplicationTargetGroup(stack, "targetgroup", {
  targets: [service2],
  protocol: elbv2.ApplicationProtocol.HTTP,
  vpc,
});
listener.addTargetGroups("targetgroup", {
  targetGroups: [tg],
  pathPattern: "/app2/*",
  priority: 100
});