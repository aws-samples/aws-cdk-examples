# EC2 Instance CDK Example

This project demonstrates how to create an EC2 instance with AWS CDK, including:

- VPC with public subnets
- EC2 instance with Amazon Linux 2023
- Access via AWS Systems Manager Session Manager (no open inbound ports)
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

The instance is reached with AWS Systems Manager Session Manager, not SSH. It has no open inbound ports. The instance role includes `AmazonSSMManagedInstanceCore`, so Session Manager works out of the box.

After deployment, the stack outputs an `ssmCommand`. Run it to open a shell on the instance (replace `<instance-id>` with the value from the output):

```bash
aws ssm start-session --target <instance-id>
```

This needs the [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) for the AWS CLI. Session Manager gives an audited shell without opening port 22 or managing SSH keys.

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
