import cdk = require('@aws-cdk/cdk');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import { Protocol } from '@aws-cdk/aws-ecs';

// Based on https://aws.amazon.com/blogs/compute/introducing-cloud-native-networking-for-ecs-containers/
class Ec2ServiceWithTaskNetworking extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const vpc = new ec2.VpcNetwork(this, 'Vpc', { maxAZs: 2 });

    const cluster = new ecs.Cluster(this, 'awsvpc-ecs-demo-cluster', { vpc });
    cluster.addCapacity('DefaultAutoScalingGroup', {
      instanceType: new ec2.InstanceType('t2.micro')
    });
    
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'nginx-awspvc', {
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

    // Allow HTTP traffic on port 80 for our containers without modifying the security group on the instance
    const securityGroup = new ec2.SecurityGroup(this, 'nigngx--7623', { 
      vpc, 
      allowAllOutbound: false,
    });
    securityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(80));

    new ecs.Ec2Service(this, 'awsvpc-ecs-demo-service', {
      cluster,
      taskDefinition,
      securityGroup,
    });
  }
};

const app = new cdk.App();
new Ec2ServiceWithTaskNetworking(app, 'sample-ec2-service-with-task-networking');
app.run();