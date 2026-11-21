# Multi-tier CDN caching for marketplace storefronts

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

This AWS CDK (TypeScript) project deploys a two-layer caching architecture for marketplace storefronts:

- **Edge layer** — Amazon CloudFront with four cache behaviors (static assets, product images, API responses, dynamic pages), each with its own TTL policy.
- **Application layer** — Amazon ElastiCache Serverless (Valkey) as an in-Region cache between the application and database.

## Architecture

```
Buyer → CloudFront ─┬─ /static/*        → S3 (OAC, year-long TTL)
                     ├─ /images/*        → S3 (OAC, 30-day TTL)
                     ├─ /api/products/*  → VPC origin → internal ALB → ECS Fargate → Valkey
                     └─ default          → VPC origin → internal ALB → ECS Fargate (no cache)
```

## Prerequisites

- AWS account with VPC, EC2, ElastiCache, S3, CloudFront, ECS, and IAM permissions
- Docker running locally (CDK builds the sample application image from `app/`)
- Node.js 18+
- AWS CDK CLI v2 (`npm install -g aws-cdk`)
- AWS CLI configured with valid credentials
- `cdk bootstrap` run once per account and Region

## Deploy

```bash
npm install
npx cdk deploy
```

## Verify

```bash
export CDN="https://<distribution-domain>.cloudfront.net"

# Static asset — expect HIT on second request
curl -sI "$CDN/static/app.css" | grep -i "x-cache"

# Product image — 30-day TTL
curl -sI "$CDN/images/product-001.png" | grep -iE "x-cache|age"

# Product API — 60-second TTL
curl -sI "$CDN/api/products/Product-1" | grep -iE "x-cache|age"

# Dynamic page — always MISS (CACHING_DISABLED)
curl -sI "$CDN/cart" | grep -i "x-cache"
```

## Clean Up

```bash
npx cdk destroy
```

The assets bucket and the CloudFront log bucket are configured with `removalPolicy: DESTROY` and `autoDeleteObjects: true` so `cdk destroy` removes them. Use a retention policy for production data.

## Security

- S3 bucket access restricted to CloudFront via Origin Access Control (OAC)
- The ALB is internal (no public address) and CloudFront reaches it through a VPC origin, so the application is not reachable except through CloudFront
- The ALB security group allows HTTP only from the VPC CIDR
- ElastiCache deployed in isolated subnets, accessible only from the application security group
- ElastiCache Serverless requires TLS — application clients must connect with TLS enabled
