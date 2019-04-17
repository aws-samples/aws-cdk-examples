import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

class WillkommenECS extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.VpcNetwork(this, 'MyVpc', { maxAZs: 2 });
    const cluster = new ecs.Cluster(this, 'Ec2Cluster', { vpc });
    cluster.addCapacity('DefaultAutoScalingGroup', {
      instanceType: new ec2.InstanceType('t2.micro')
    });

    // create a task definition with CloudWatch Logs
    const logging = new ecs.AwsLogDriver(this, "AppLogging", {
      streamPrefix: "myapp",
    })

    const taskDef = new ecs.Ec2TaskDefinition(this, "MyTaskDefinition");
    taskDef.addContainer("AppContainer", {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      memoryLimitMiB: 512,
      logging,
    })

    // Instantiate ECS Service with just cluster and image
    new ecs.Ec2Service(this, "Ec2Service", {
      cluster,
      taskDefinition: taskDef,
    });
  }
}

const app = new cdk.App();

new WillkommenECS(app, 'Willkommen');

app.run();
