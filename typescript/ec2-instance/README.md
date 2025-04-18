# EC2 Instance CDK Example

This project demonstrates how to create an EC2 instance with AWS CDK, including:

- VPC with public subnets
- Security groups for SSH access
- EC2 instance with Amazon Linux 2023
- CloudFormation Init for instance configuration
- Asset deployment via S3
- CloudWatch integration

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 16 or later
- TypeScript

## Environment Variables

You can customize the deployment with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `INFO` |
| `SSH_PUB_KEY` | Your SSH public key for instance access | ` ` (empty) |
| `CPU_TYPE` | CPU architecture (`ARM64` or `X86`) | `ARM64` |
| `INSTANCE_SIZE` | Instance size (`LARGE`, `XLARGE`, `XLARGE2`, `XLARGE4`) | `LARGE` |

## Getting Started

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy the stack
npx cdk deploy
```

## Connecting to the Instance

After deployment, the CDK will output commands to connect to your instance:

- Using SSH: `ssh ec2-user@<public-dns-name>`
- Using SSM: `aws ssm start-session --target <instance-id>`

## Testing

```bash
npm test
```

## Clean Up

```bash
npx cdk destroy
```

## Project Structure

- `bin/app.ts` - Entry point for CDK application
- `lib/ec2-stack.ts` - Main stack definition
- `lib/constructs/` - CDK constructs for VPC and EC2 server
- `lib/utils/` - Utility functions and validators
- `lib/resources/` - Configuration files and assets for the EC2 instance
- `test/` - Jest tests for the CDK constructs
