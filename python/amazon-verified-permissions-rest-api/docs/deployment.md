# Deployment Guide

> Verified Permissions is available in specific AWS regions. Choose a supported region (for example, `ap-south-1`) before deploying.

## Prerequisites

- AWS account with permissions to create IAM, Cognito, Lambda, API Gateway, and Verified Permissions resources.
- AWS CLI configured with credentials for the target account and region.
- Node.js v22.20.0 or lts (required for the AWS CDK Toolkit and Lambda bundling).
- Python 3.13 or later.
- AWS CDK Toolkit (`npm install -g aws-cdk@latest`).

## Set Up the Project Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If the virtual environment fails to create automatically, create it manually with the same commands.

## Bootstrap the Environment (First Deployment Only)

```bash
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

Replace `<ACCOUNT_ID>` and `<REGION>` with the target deployment values.

## Deploy the Stack

```bash
cdk deploy
```

The deployment outputs the REST API endpoint (for example, `https://abc123.execute-api.us-east-1.amazonaws.com/prod/`). Record this value for testing.

## Updating the Stack

After modifying infrastructure or policies, redeploy with the same command:

```bash
cdk deploy
```

CDK will perform a change set comparison and apply only the required updates.
