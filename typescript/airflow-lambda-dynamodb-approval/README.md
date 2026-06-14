# MWAA with Lambda Invocation and DynamoDB Human Approval

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example.** It should successfully build out of the box.

---
<!--END STABILITY BANNER-->

This example deploys an Amazon MWAA (Managed Workflows for Apache Airflow) environment with two DAGs demonstrating common integration patterns:

1. **Lambda Invocation** - Airflow invokes a Lambda function and processes the response
2. **DynamoDB Human Approval** - A sensor-based workflow that waits for manual approval in DynamoDB before proceeding

## Architecture

```
                          ┌──────────────────┐
                          │   Airflow DAG    │
                          │ (Lambda Invoke)  │
                          └────────┬─────────┘
                                   │ invoke
                                   ▼
┌─────────┐   DAGs    ┌──────────────────┐    ┌──────────────┐
│   S3    │◄──────────│      MWAA        │───►│    Lambda    │
│ Bucket  │           │   Environment    │    │   Function   │
└─────────┘           └────────┬─────────┘    └──────────────┘
                               │
                               │ put/get/sensor
                               ▼
                      ┌──────────────────┐
                      │    DynamoDB      │◄── Human approves
                      │  Approval Table  │    via AWS Console
                      └──────────────────┘
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

Note the outputs:
- **MwaaWebServerUrl** - Airflow web UI (requires AWS Console login)
- **ApprovalTableName** - DynamoDB table for the approval workflow
- **DemoFunctionName** - Lambda function invoked by the DAG

## Usage

### Lambda Invoke DAG

1. Open the Airflow UI via the `MwaaWebServerUrl` output
2. Trigger the `lambda_invoke` DAG
3. View task logs to see the Lambda response

### DynamoDB Approval DAG

1. Trigger the `ddb_approval_workflow` DAG
2. The DAG creates a PENDING item in DynamoDB and waits
3. In the AWS Console, open DynamoDB, find the item, and change `approval_status` to `APPROVED`
4. The DAG detects the change and completes processing

## Cleanup

```bash
npx cdk destroy
```

## Security Notes

This example follows CDK best practices:
- Uses `grantInvoke()`, `grantRead()`, and `grantReadWriteData()` for scoped IAM
- No `expose_config` in Airflow settings
- SQS and CloudWatch Logs permissions scoped to MWAA-specific resources
- KMS permissions conditioned via `kms:ViaService`
- All DAGs use `schedule=None` to avoid unintended costs

For production, additionally consider:
- `PRIVATE_ONLY` web access mode with VPC endpoints
- Point-in-time recovery on DynamoDB
- S3 bucket encryption with customer-managed KMS key
