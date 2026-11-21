#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MarketplaceCdnCacheStack } from '../lib/marketplace-cdn-cache-stack';

const app = new cdk.App();
new MarketplaceCdnCacheStack(app, 'MarketplaceCdnCacheStack', {
  description: 'Two-layer CDN caching for marketplace storefronts (CloudFront + ElastiCache Valkey)',
});
