import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

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

    // Upload sample files so the Verify steps return cache hits on a fresh deploy.
    new s3deploy.BucketDeployment(this, 'SampleAssets', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'assets'))],
      destinationBucket: assetsBucket,
    });

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
        // Sample cache-aside app in ../app. Replace with your own application.
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '..', 'app')),
        containerPort: 8080,
        environment: {
          CACHE_ENDPOINT: cacheCluster.attrEndpointAddress,
          CACHE_PORT: cacheCluster.attrEndpointPort,
        },
      },
      // Internal ALB in private subnets. CloudFront reaches it through a VPC origin.
      publicLoadBalancer: false,
      openListener: false,
    });

    // Allow app to access cache (port 6379 for Valkey)
    cacheSecurityGroup.addIngressRule(
      appService.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      'Allow app to access Valkey cache'
    );

    // CloudFront connects to the internal ALB through ENIs in the VPC, so allow
    // HTTP from the VPC CIDR only. The ALB has no internet-facing address.
    appService.loadBalancer.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(80),
      'Allow CloudFront VPC origin to reach the ALB'
    );

    // --- CloudFront Distribution ---
    // --- CloudFront Distribution ---
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED, // CloudFront standard logs need ACLs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const appOrigin = origins.VpcOrigin.withApplicationLoadBalancer(appService.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY, // traffic stays inside the VPC
    });

    const distribution = new cloudfront.Distribution(this, 'MarketplaceCDN', {
      defaultBehavior: {
        origin: appOrigin,
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
          origin: appOrigin,
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
      logBucket,
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
  }
}
