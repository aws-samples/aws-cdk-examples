import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import cdk = require('aws-cdk-lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'sample-aws-ecs-integ-ecs');

// Create a cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2 });

const cluster = new ecs.Cluster(stack, 'EcsCluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3_AMD, ec2.InstanceSize.MICRO)
});

// Create Task Definition with placement constraint
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef');

const container = taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
  memoryLimitMiB: 256,
});

container.addPortMappings({
  containerPort: 80,
  hostPort: 8080,
  protocol: ecs.Protocol.TCP,
});

// Create Service
const service = new ecs.Ec2Service(stack, 'Service', {
  cluster,
  taskDefinition,
  placementConstraints: [
        ecs.PlacementConstraint.distinctInstances()
    ]
});

// Specify binpack by memory and spread across availability zone as placement strategies.
// To place randomly, call: service.placeRandomly()
service.addPlacementStrategies(
  ecs.PlacementStrategy.packedBy(ecs.BinPackResource.MEMORY),
  ecs.PlacementStrategy.spreadAcross(ecs.BuiltInAttributes.AVAILABILITY_ZONE));

app.synth();
