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

  test('origin-verify secret is generated in Secrets Manager, not hardcoded', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: Match.objectLike({ GenerateStringKey: 'headerValue' }),
    });
    // The placeholder from the original draft must never appear in the template.
    expect(JSON.stringify(template.toJSON())).not.toContain('your-secret-value-here');
  });

  test('ALB listener default action is a 403 fixed response', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      DefaultActions: [
        Match.objectLike({
          Type: 'fixed-response',
          FixedResponseConfig: Match.objectLike({ StatusCode: '403' }),
        }),
      ],
    });
  });

  test('ALB listener rule forwards only when X-Origin-Verify header matches', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Priority: 1,
      Conditions: Match.arrayWith([
        Match.objectLike({
          Field: 'http-header',
          HttpHeaderConfig: Match.objectLike({ HttpHeaderName: 'X-Origin-Verify' }),
        }),
      ]),
      Actions: [Match.objectLike({ Type: 'forward' })],
    });
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
