import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class ECSStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: ECSStackProps) {
        super(scope, id, props);

        const cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: props?.vpc
        });

        const loadBalancedFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster,
            memoryLimitMiB: 512,
            desiredCount: 1,
            cpu: 256,
            taskImageOptions: {
                image: ecs.ContainerImage.fromAsset('app', {}),
            },
        });

        loadBalancedFargateService.targetGroup.configureHealthCheck({
            path: '/health',
        });
    }
}

interface ECSStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}