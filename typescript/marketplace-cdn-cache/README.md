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

The architecture is covered step by step in the companion AWS cross-service tutorial, *Multi-tier CDN caching for marketplace storefronts on AWS* (link to be added when the tutorial publishes).

This example also demonstrates a less-obvious CDK pattern: overriding the default action of a listener created by the `ApplicationLoadBalancedFargateService` pattern construct. `listener.addAction()` adds rules rather than replacing the default, so the example uses an L1 escape hatch (`addPropertyOverride` on `CfnListener`) to swap the default forward action for a fixed `403`.

## Architecture

```
Buyer → CloudFront ─┬─ /static/*        → S3 (OAC, year-long TTL)
                     ├─ /images/*        → S3 (OAC, 30-day TTL)
                     ├─ /api/products/*  → ALB → ECS Fargate → Valkey → DB
                     └─ default          → ALB → ECS Fargate (no cache)
```

## Prerequisites

- AWS account with VPC, EC2, ElastiCache, S3, CloudFront, ECS, Secrets Manager, and IAM permissions
- Node.js 18+
- AWS CDK CLI v2 (`npm install -g aws-cdk`)
- AWS CLI configured with valid credentials
- `cdk bootstrap` run once per account and Region

## Deploy

```bash
npm install
npx cdk deploy
```

Estimated time: ~60 minutes for deployment, ~30 minutes for verification.

## Verify

```bash
export CDN="https://<distribution-domain>.cloudfront.net"

# Static asset — expect HIT on second request
curl -sI "$CDN/static/app.css" | grep -i "x-cache"

# Product image — 30-day TTL
curl -sI "$CDN/images/product-001.png" | grep -iE "x-cache|age"

# Product API — 60-second TTL
curl -sI "$CDN/api/products/123" | grep -iE "x-cache|age"

# Dynamic page — always MISS (CACHING_DISABLED)
curl -sI "$CDN/cart" | grep -i "x-cache"

# Direct ALB access — should return 403 (origin lock-down)
curl -sI "http://<alb-dns-name>/api/products/123" -o /dev/null -w "%{http_code}\n"
```

## Clean Up

```bash
npx cdk destroy
```

## Security

- S3 bucket access restricted to CloudFront via Origin Access Control (OAC)
- ALB protected by a custom `X-Origin-Verify` header (generated in Secrets Manager at deploy time)
- Direct ALB access returns 403
- ElastiCache deployed in isolated subnets, accessible only from the application security group
- ElastiCache Serverless requires TLS — application clients must connect with TLS enabled

## Contributors

- Gopal Surapaneni, Sr. SSA, AWS Marketplace
- Nathan Bigman, Sr. Technical Writer

## License

This library is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file.
