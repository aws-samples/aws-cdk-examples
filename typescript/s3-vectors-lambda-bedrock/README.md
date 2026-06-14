# S3 Vectors RAG Pipeline with Lambda and Amazon Bedrock

<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example uses Amazon S3 Vectors (re:Invent 2025 GA) which requires `@aws-sdk/client-s3vectors` SDK.

---
<!--END STABILITY BANNER-->

This example builds a Retrieval Augmented Generation (RAG) pipeline using Amazon S3 Vectors for vector storage, Amazon Titan Embeddings for vectorization, and Claude on Amazon Bedrock for answer generation.

## Architecture

```
Ingest: Documents → Lambda → Titan Embeddings → S3 Vectors (store)
Query:  Question  → Lambda → Titan Embeddings → S3 Vectors (search) → Claude (generate answer)
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
# Ingest documents
aws lambda invoke --function-name <IngestFunctionName> \
  --payload '{"documents":[{"key":"doc1","text":"Lambda Durable Functions checkpoint state automatically."},{"key":"doc2","text":"S3 Vectors stores embeddings at 90% lower cost than specialized databases."}]}' \
  output.json && cat output.json

# Query
aws lambda invoke --function-name <QueryFunctionName> \
  --payload '{"question":"How do durable functions handle state?"}' \
  output.json && cat output.json
```

## Cleanup

```bash
npx cdk destroy
```
