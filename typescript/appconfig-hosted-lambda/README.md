# AppConfig Hosted Configuration with Lambda Extension

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example.** It should successfully build out of the box.

---
<!--END STABILITY BANNER-->

This example deploys an AWS AppConfig hosted configuration with feature flags, consumed by a Lambda function via the [AppConfig Lambda Extension](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html).

## Architecture

```
Lambda Function
  │
  │ HTTP GET localhost:2772
  ▼
AppConfig Lambda Extension (sidecar)
  │
  │ polls / caches
  ▼
AppConfig Service
  └── Application: MyFeatureFlags
      └── Environment: Production
          └── Hosted Configuration (feature flags JSON)
```

The Lambda Extension:
- Runs as a local HTTP server on port 2772 inside the Lambda execution environment
- Handles configuration caching, polling, and session management
- No need to hardcode layer ARNs - CDK's `grantReadConfig()` manages the extension automatically

## Feature Flags

The example deploys two feature flags:

| Flag | Default |
|------|---------|
| `dark_mode` | enabled |
| `new_checkout` | disabled |

Update flags in the AppConfig console or by modifying the `content` in `index.ts` and redeploying.

## Build

```bash
npm install
npm run build
```

## Deploy

```bash
npx cdk deploy
```

## Test

```bash
aws lambda invoke \
  --function-name $(aws cloudformation describe-stacks \
    --stack-name AppConfigHostedLambdaStack \
    --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' \
    --output text) \
  --payload '{}' \
  output.json && cat output.json
```

Expected response:
```json
{
  "statusCode": 200,
  "body": "{\"flags\": {\"dark_mode\": true, \"new_checkout\": false}, \"message\": \"Dark mode is ON\"}"
}
```

## How it works

1. CDK creates an AppConfig Application, Environment, and HostedConfiguration with feature flag JSON
2. `grantReadConfig()` adds the AppConfig Lambda Extension layer and IAM permissions automatically
3. At runtime, the Lambda calls `http://localhost:2772/applications/.../configurations/...` to fetch flags
4. The extension caches the config locally - no cold-start penalty on subsequent invocations

## Cleanup

```bash
npx cdk destroy
```
