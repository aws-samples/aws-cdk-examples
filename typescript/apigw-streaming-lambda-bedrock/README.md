# API Gateway REST Streaming with Lambda and Amazon Bedrock

<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example uses API Gateway REST response streaming (re:Invent 2025 launch) with `ResponseTransferMode: STREAM`.

---
<!--END STABILITY BANNER-->

This example creates an API Gateway REST API that streams responses from Amazon Bedrock (Claude) via Lambda response streaming, delivering tokens to the client as they are generated.

## Architecture

```
Client → API Gateway (REST, streaming) → Lambda (streamifyResponse) → Bedrock (InvokeModelWithResponseStream)
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
curl -N -X POST <ApiEndpoint> \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain serverless in 3 sentences"}'
```

## Cleanup

```bash
npx cdk destroy
```
