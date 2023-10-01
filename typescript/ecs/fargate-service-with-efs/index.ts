import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as iam from 'aws-cdk-lib/aws-iam';


class FargateEfs extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'DefaultVpc', { maxAzs: 2});
    const ecsCluster = new ecs.Cluster(this, 'DefaultEcsCluster', {vpc: vpc});

    const fileSystem = new efs.FileSystem(this, 'MyEfsFileSystem', {
      vpc: vpc,
      encrypted: true,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING
    });

    fileSystem.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['elasticfilesystem:ClientMount'],
        principals: [new iam.AnyPrincipal()],
        conditions: {
          Bool: {
            'elasticfilesystem:AccessedViaMountTarget': 'true'
          }
        }
      })
    )

    const taskDef = new ecs.FargateTaskDefinition(this, "MyTaskDefinition", {
        memoryLimitMiB: 512,
        cpu: 256,
        volumes: [
            {
                name: "uploads",
                efsVolumeConfiguration: {
                    fileSystemId: fileSystem.fileSystemId,
                }
            }
        ]
    });

    const containerDef = new ecs.ContainerDefinition(this, "MyContainerDefinition", {
      image: ecs.ContainerImage.fromRegistry("coderaiser/cloudcmd"),
      taskDefinition: taskDef
    });

    containerDef.addMountPoints(
      {
        sourceVolume: "uploads",
        containerPath: "/uploads",
        readOnly: false
      }
    )

    containerDef.addPortMappings({
      containerPort: 8000
    });

    const albFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service01', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    // Allow access to EFS from Fargate ECS
    fileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);
  }
}

const app = new cdk.App();
new FargateEfs(app, 'FargateEfsDemo01');
app.synth();
