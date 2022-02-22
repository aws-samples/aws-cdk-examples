import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as cr from 'aws-cdk-lib/custom-resources';
import {FargateEfsCustomResource} from "./efs-mount-fargate-cr";



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


     const params = {
      FileSystemId: fileSystem.fileSystemId,
      PosixUser: {
        Gid: 1000,
        Uid: 1000
      },
      RootDirectory: {
        CreationInfo: {
          OwnerGid: 1000,
          OwnerUid: 1000,
          Permissions: '755'
        },
        Path: '/uploads'
      },
      Tags: [
        {
          Key: 'Name',
          Value: 'ecsuploads'
        }
      ]
    };

    const efsAccessPoint = new cr.AwsCustomResource(this, 'EfsAccessPoint', {
       onUpdate: {
           service: 'EFS',
           action: 'createAccessPoint',
           parameters: params,
           physicalResourceId: cr.PhysicalResourceId.of('12121212121'),
       },
       policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });

    efsAccessPoint.node.addDependency(fileSystem);

    const taskDef = new ecs.FargateTaskDefinition(this, "MyTaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const containerDef = new ecs.ContainerDefinition(this, "MyContainerDefinition", {
      image: ecs.ContainerImage.fromRegistry("coderaiser/cloudcmd"),
      taskDefinition: taskDef
    });

    containerDef.addPortMappings({
      containerPort: 8000
    });

    const albFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service01', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    // Override Platform version (until Latest = 1.4.0)
    const albFargateServiceResource = albFargateService.service.node.findChild('Service') as ecs.CfnService;
    albFargateServiceResource.addPropertyOverride('PlatformVersion', '1.4.0')

    // Allow access to EFS from Fargate ECS
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);

    //Custom Resource to add EFS Mount to Task Definition
    const resource = new FargateEfsCustomResource(this, 'FargateEfsCustomResource', {
        TaskDefinition: taskDef.taskDefinitionArn,
        EcsService: albFargateService.service.serviceName,
        EcsCluster: ecsCluster.clusterName,
        EfsFileSystemId: fileSystem.fileSystemId,
        EfsMountName: 'uploads'
    });

    resource.node.addDependency(albFargateService);
  }
}

const app = new cdk.App();
new FargateEfs(app, 'FargateEfsDemo01');
app.synth();
