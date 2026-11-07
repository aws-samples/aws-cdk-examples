import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class MarketplaceCdnCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- VPC ---
    const vpc = new ec2.Vpc(this, 'MarketplaceVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: 'Isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // --- S3 bucket for static assets ---
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // --- Origin-verification secret (Secrets Manager) ---
    // Generate at deploy time so the value never appears in source control
    // or the synthesized CloudFormation template in plaintext.
    const originVerifySecret = new secretsmanager.Secret(this, 'OriginVerifySecret', {
      secretName: 'marketplace/origin-verify',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'headerValue',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const originVerifyHeaderValue = originVerifySecret
      .secretValueFromJson('headerValue')
      .unsafeUnwrap(); // resolved at deploy time, not stored in source

    // --- ElastiCache Serverless (Valkey) ---
    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSG', {
      vpc,
      description: 'Allow Valkey access from application only',
      allowAllOutbound: false,
    });

    const cacheCluster = new elasticache.CfnServerlessCache(this, 'MarketplaceCache', {
      engine: 'valkey',
      serverlessCacheName: 'marketplace-product-cache',
      securityGroupIds: [cacheSecurityGroup.securityGroupId],
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds,
    });

    // --- Application (Fargate behind ALB) ---
    const appService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'AppService', {
      vpc,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 2,
      minHealthyPercent: 100, // keep both tasks serving during deployments
      circuitBreaker: { rollback: true }, // fail fast and roll back if tasks can't start
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
        containerPort: 80,
        environment: {
          CACHE_ENDPOINT: cacheCluster.attrEndpointAddress,
          CACHE_PORT: cacheCluster.attrEndpointPort,
        },
      },
      publicLoadBalancer: true,
    });

    // Allow app to access cache (port 6379 for Valkey)
    cacheSecurityGroup.addIngressRule(
      appService.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      'Allow app to access Valkey cache'
    );

    // --- ALB origin-verification: lock down the listener ---
    //
    // The pattern construct created a listener whose default action forwards
    // to the target group. We need to:
    //   1. Add a priority-1 rule that forwards ONLY when X-Origin-Verify matches.
    //   2. Change the default action to return 403 for everything else.
    //
    // Step 1: Add the header-match forwarding rule (L2 construct).
    new elbv2.ApplicationListenerRule(this, 'OriginVerifyRule', {
      listener: appService.listener,
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.httpHeader('X-Origin-Verify', [originVerifyHeaderValue]),
      ],
      action: elbv2.ListenerAction.forward([appService.targetGroup]),
    });

    // Step 2: Override the default action to 403 via the L1 escape hatch.
    // The pattern's listener default action forwards all traffic. We replace
    // it with a fixed 403 so requests that bypass CloudFront are rejected.
    const cfnListener = appService.listener.node.defaultChild as elbv2.CfnListener;
    cfnListener.addPropertyOverride('DefaultActions', [
      {
        Type: 'fixed-response',
        FixedResponseConfig: {
          StatusCode: '403',
          ContentType: 'text/plain',
          MessageBody: 'Forbidden — access this application through CloudFront.',
        },
      },
    ]);

    // --- CloudFront Distribution ---
    const distribution = new cloudfront.Distribution(this, 'MarketplaceCDN', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(appService.loadBalancer, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          customHeaders: { 'X-Origin-Verify': originVerifyHeaderValue },
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {
        '/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'ImagesCachePolicy', {
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
          }),
        },
        '/api/products/*': {
          origin: new origins.LoadBalancerV2Origin(appService.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            customHeaders: { 'X-Origin-Verify': originVerifyHeaderValue },
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'ProductApiCachePolicy', {
            defaultTtl: cdk.Duration.seconds(60),
            maxTtl: cdk.Duration.seconds(300),
            minTtl: cdk.Duration.seconds(1),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          }),
        },
      },
      enableLogging: true,
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: assetsBucket.bucketName,
      description: 'S3 bucket for static assets',
    });

    new cdk.CfnOutput(this, 'ALBDomain', {
      value: appService.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
    });
  }
}
