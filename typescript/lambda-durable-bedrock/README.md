# Lambda Durable Functions with Amazon Bedrock

<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example uses AWS Lambda Durable Functions (re:Invent 2025 launch) which requires `nodejs24.x` runtime and the `@aws/durable-execution-sdk-js` SDK.

---
<!--END STABILITY BANNER-->

This example demonstrates AWS Lambda Durable Functions integrated with Amazon Bedrock to build a multi-step AI content generation workflow with automatic checkpointing.

The Lambda function uses durable execution to:
1. Generate a blog outline using Bedrock (Claude)
2. Wait 5 seconds (simulating editorial review)
3. Expand the outline into a draft
4. Generate a summary

Each step is automatically checkpointed — if the function fails mid-execution, it resumes from the last completed step rather than restarting.

## Architecture

```
User → Lambda (Durable) → Step 1: Bedrock (outline)
                        → Wait (5s)
                        → Step 2: Bedrock (draft)
                        → Step 3: Bedrock (summary)
                        → Return result
```

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
  --function-name <FunctionName> \
  --qualifier <VersionNumber> \
  --payload '{"topic":"AWS Lambda Durable Functions"}' \
  output.json && cat output.json
```

## Cleanup

```bash
npx cdk destroy
```
