import cdk = require('@aws-cdk/cdk');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import { Protocol } from '@aws-cdk/aws-ecs';

// Based on https://aws.amazon.com/blogs/compute/introducing-cloud-native-networking-for-ecs-containers/
const app = new cdk.App();
const stack = new cdk.Stack(app, 'ec2-service-with-task-networking');

// Create the cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAZs: 2 });

const cluster = new ecs.Cluster(stack, 'awsvpc-ecs-demo-cluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', {
  instanceType: new ec2.InstanceType('t2.micro')
});

// Create a task definition with its own elastic network interface
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'nginx-awspvc', {
  networkMode: ecs.NetworkMode.AwsVpc,
});

const webContainer = taskDefinition.addContainer('nginx', {
  image: ecs.ContainerImage.fromRegistry('nginx:latest'),
  cpu: 100,
  memoryLimitMiB: 256,
  essential: true,
});

webContainer.addPortMappings({
  containerPort: 80,
  protocol: Protocol.Tcp,
});

// Create a security group that allows HTTP traffic on port 80 for our containers without modifying the security group on the instance
const securityGroup = new ec2.SecurityGroup(stack, 'nginx--7623', { 
  vpc, 
  allowAllOutbound: false,
});

securityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(80));

// Create the service
new ecs.Ec2Service(stack, 'awsvpc-ecs-demo-service', {
  cluster,
  taskDefinition,
  securityGroup,
});

app.synth();
