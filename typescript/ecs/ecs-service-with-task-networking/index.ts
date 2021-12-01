import cdk = require('aws-cdk-lib');
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');

// Based on https://aws.amazon.com/blogs/compute/introducing-cloud-native-networking-for-ecs-containers/
const app = new cdk.App();
const stack = new cdk.Stack(app, 'ec2-service-with-task-networking');

// Create the cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2 });

const cluster = new ecs.Cluster(stack, 'awsvpc-ecs-demo-cluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO)
});

// Create a task definition with its own elastic network interface
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'nginx-awspvc', {
  networkMode: ecs.NetworkMode.AWS_VPC,
});

const webContainer = taskDefinition.addContainer('nginx', {
  image: ecs.ContainerImage.fromRegistry('nginx:latest'),
  cpu: 100,
  memoryLimitMiB: 256,
  essential: true,
});

webContainer.addPortMappings({
  containerPort: 80,
  protocol: ecs.Protocol.TCP,
});

// Create a security group that allows HTTP traffic on port 80 for our containers without modifying the security group on the instance
const securityGroup = new ec2.SecurityGroup(stack, 'nginx--7623', {
  vpc,
  allowAllOutbound: false,
});

securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

// Create the service
new ecs.Ec2Service(stack, 'awsvpc-ecs-demo-service', {
  cluster,
  taskDefinition,
  securityGroups: [securityGroup],
});

app.synth();
