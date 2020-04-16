import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import efs = require('@aws-cdk/aws-efs');
import cr = require('@aws-cdk/custom-resources');
import {FargateEfsCustomResource} from "./efs-mount-fargate-cr";

class FargateEfs extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'defaultCellVpc', { maxAzs: 2});
    const ecsCluster = new ecs.Cluster(this, 'defaultCellEcsCluster', {vpc: vpc });

    const fileSystem = new efs.EfsFileSystem(this, 'MyEfsFileSystem', {
      vpc: vpc,
      encrypted: true,
      lifecyclePolicy: efs.EfsLifecyclePolicyProperty.AFTER_14_DAYS,
      performanceMode: efs.EfsPerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.EfsThroughputMode.BURSTING
    });

     var params = {
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

    const efsAccessPoint = new cr.AwsCustomResource(this, 'efsAccessPoint', {
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