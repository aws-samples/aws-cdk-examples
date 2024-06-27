import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, EcrImage } from 'aws-cdk-lib/aws-ecs';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import path = require('path');

interface vpcStackProps extends cdk.StackProps {
    readonly vpc: Vpc;
}

export class ecsFargateStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: vpcStackProps) {
        super(scope, id, props);

    const cluster = new Cluster(this, 'ecsCluster', {
        vpc: props.vpc,
        containerInsights: true,
    });
    const asset = new DockerImageAsset(this, 'AppImage', {
        directory: path.join(__dirname, '..', 'src')
      });
    
    // 👇 create a new ecs pattern with an alb 👇
    const loadBalancedFargateService = new ApplicationLoadBalancedFargateService (this, 'ecsPattern', {
        cluster,
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        publicLoadBalancer: true,
        taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        taskImageOptions: {
            image: EcrImage.fromDockerImageAsset(asset),
        },
        enableExecuteCommand: true,
        });

    // 👇 auto scale task count 👇
    const scalableTarget = loadBalancedFargateService.service.autoScaleTaskCount({
        minCapacity: 1,
        maxCapacity: 6,
        });
        // 👇 auto scale cpu trigger 👇
        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
        });
        // 👇 auto scale memory trigger 👇
        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 50,
        });
        // 👇 load balancer health check 👇
        loadBalancedFargateService.targetGroup.configureHealthCheck({
            path: "/",
        });
    }
}
