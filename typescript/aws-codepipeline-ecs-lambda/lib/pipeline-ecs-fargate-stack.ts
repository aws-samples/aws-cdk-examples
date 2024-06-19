import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage } from 'aws-cdk-lib/aws-ecs';

export class ecsPatternsStack extends cdk.Stack {
    public readonly vpc:   IVpc;
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

    this.vpc = new Vpc (this, "ecsVpc", {
        natGateways: 1,
    });

    const cluster = new Cluster(this, 'ecsCluster', {
        vpc: this.vpc,
        containerInsights: true,
    });
    
    // 👇 create a new ecs pattern with an alb 👇
    const loadBalancedFargateService = new ApplicationLoadBalancedFargateService (this, 'ecsPattern', {
        cluster: cluster,
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        publicLoadBalancer: true,
        taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        taskImageOptions: {
            image: ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
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