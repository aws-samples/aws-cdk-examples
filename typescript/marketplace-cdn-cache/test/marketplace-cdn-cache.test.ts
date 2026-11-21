import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MarketplaceCdnCacheStack } from '../lib/marketplace-cdn-cache-stack';

describe('MarketplaceCdnCacheStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new MarketplaceCdnCacheStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('creates one CloudFront distribution with four cache behaviors', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: '/static/*' }),
          Match.objectLike({ PathPattern: '/images/*' }),
          Match.objectLike({ PathPattern: '/api/products/*' }),
        ]),
      },
    });
  });

  test('CloudFront reaches an internal ALB through a VPC origin', () => {
    template.resourceCountIs('AWS::CloudFront::VpcOrigin', 1);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.resourceCountIs('AWS::SecretsManager::Secret', 0);
  });

  test('no security group allows ingress from 0.0.0.0/0', () => {
    const groups = Object.values(template.findResources('AWS::EC2::SecurityGroup'));
    const inline = groups.map((g) => g.Properties.SecurityGroupIngress ?? []);
    const rules = template.findResources('AWS::EC2::SecurityGroupIngress');
    expect(JSON.stringify({ inline, rules })).not.toContain('0.0.0.0/0');
  });

  test('S3 assets bucket blocks all public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('ElastiCache Serverless cache uses the Valkey engine', () => {
    template.hasResourceProperties('AWS::ElastiCache::ServerlessCache', {
      Engine: 'valkey',
    });
  });
});
