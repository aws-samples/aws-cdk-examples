import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

class WillkommenFargate extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.VpcNetwork(this, 'MyVpc', { maxAZs: 2 });
    const cluster = new ecs.Cluster(this, 'Ec2Cluster', { vpc });

    // create a task definition with CloudWatch Logs
    const logging = new ecs.AwsLogDriver(this, "AppLogging", {
        streamPrefix: "myapp",
    })
    const taskDef = new ecs.TaskDefinition(this, "MyTaskDefinition", {
        compatibility: ecs.Compatibility.Fargate,
        memoryMiB: '512',
        cpu: '256',
    })
    taskDef.addContainer("AppContainer", {
        image: ecs.ContainerImage.fromDockerHub("amazon/amazon-ecs-sample"),
        logging,
    })

    // Instantiate ECS Service with just cluster and image
    new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition: taskDef
    });

  }
}

const app = new cdk.App();

new WillkommenFargate(app, 'Willkommen');

app.run();
