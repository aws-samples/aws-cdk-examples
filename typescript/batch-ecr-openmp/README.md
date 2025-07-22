# AWS Batch with ECR and Lambda
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This example demonstrates how to use AWS Batch with a containerized C++ OpenMP application stored in Amazon ECR, with optional Lambda function for job submission. The OpenMP application performs parallel computing benchmarks (arithmetic operations, mathematical functions, matrix multiplication) to demonstrate CPU-intensive workloads and compare sequential vs parallel execution performance.

## Prerequisites

Before deploying, ensure you have:
- AWS CLI configured with sufficient permissions for infrastructure deployment
  - AdministratorAccess recommended, or custom policy with EC2, VPC, Batch, ECR, Lambda, IAM, CloudFormation, and CloudWatch Logs permissions
- Docker installed and running
- Node.js and npm installed
- `jq` command-line JSON processor (for job submission script)

## Quick Start

For a complete end-to-end deployment and testing:

```bash
# 1. Test locally first (optional but recommended)
./scripts/test-local.sh

# 2. Deploy everything to AWS
AWS_PROFILE=your-profile ./scripts/build-and-deploy.sh

# 3. Submit a benchmark job
./scripts/submit-job.sh --benchmark-type simple
```

## Build

To build this app manually, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

### Option 1: Automated Deployment (Recommended)

Use the provided script for a complete deployment:

```bash
AWS_PROFILE=your-profile ./scripts/build-and-deploy.sh
```

This script will:
1. Build the CDK stack
2. Deploy the infrastructure to AWS
3. Build and push the Docker image to ECR
4. Save deployment information for job submission

### Option 2: Manual Deployment

For manual control over each step:

```bash
# Deploy CDK stack
npx cdk deploy --profile your-profile

# Get ECR login and build/push Docker image
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account.dkr.ecr.your-region.amazonaws.com
docker build -f docker/Dockerfile -t openmp-benchmark:latest .
docker tag openmp-benchmark:latest your-account.dkr.ecr.your-region.amazonaws.com/openmp-benchmark:latest
docker push your-account.dkr.ecr.your-region.amazonaws.com/openmp-benchmark:latest
```

After deployment, you will see the Stack outputs, which include the ECR repository URI and Batch job queue name.

## Running Benchmarks

After successful deployment, you can submit OpenMP benchmark jobs using the provided script:

### Basic Usage

```bash
# Submit a simple benchmark (default)
./scripts/submit-job.sh

# Submit specific benchmark types
./scripts/submit-job.sh --benchmark-type math
./scripts/submit-job.sh --benchmark-type matrix
./scripts/submit-job.sh --benchmark-type heavy
./scripts/submit-job.sh --benchmark-type all
```

### Advanced Options

```bash
# Custom parameters
./scripts/submit-job.sh --benchmark-type matrix --instance c6i.2xlarge --threads 8

# Submit via Lambda function
./scripts/submit-job.sh --method lambda --benchmark-type simple

# Preview commands without executing
./scripts/submit-job.sh --dry-run --benchmark-type all
```

### Available Benchmark Types

- **simple** - Basic arithmetic operations (~2 seconds)
- **math** - Mathematical functions: sin, cos, sqrt, pow (~5 seconds)
- **matrix** - Matrix multiplication (memory intensive, ~3 seconds)
- **heavy** - Complex arithmetic expressions (~3 seconds)
- **all** - Run all benchmarks sequentially (~15 seconds total)

### Monitoring Jobs

After submitting a job, you can monitor it through:

1. **AWS Console**:
   - Batch: https://console.aws.amazon.com/batch/
   - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/

2. **AWS CLI**:
   ```bash
   # Check job status
   aws batch describe-jobs --profile your-profile --jobs <JOB_ID>
   
   # View logs
   aws logs describe-log-streams --profile your-profile --log-group-name /aws/batch/openmp-benchmark
   ```

## Testing

### Local Testing

Before deploying to AWS, you can test the OpenMP application locally:

```bash
./scripts/test-local.sh
```

This script will:
1. Build the OpenMP application locally
2. Run C++ unit tests (8 test cases)
3. Execute integration tests with various parameters
4. Build and test the Docker container
5. Run CDK unit tests

### What Gets Tested

- ✓ OpenMP application builds successfully
- ✓ C++ unit tests pass (sequential vs parallel validation)
- ✓ Integration tests with different parameters
- ✓ Docker container builds and runs correctly
- ✓ CDK stack synthesizes without errors

## The Component Structure

The whole component contains:

- An ECR repository for storing the Docker image
- AWS Batch compute environment with managed EC2 instances
- AWS Batch job definition and job queue
- Lambda function for job submission (optional)
- VPC with public and private subnets
- CloudWatch log group for job logs

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

After building your TypeScript code, you will be able to run the CDK toolkit commands as usual:

```bash
    $ cdk ls
    <list all stacks in this program>

    $ cdk synth
    <generates and outputs cloudformation template>

    $ cdk deploy
    <deploys stack to your account>

    $ cdk diff
    <shows diff against deployed stack>
```

## Cleanup

To completely remove all AWS resources and avoid ongoing charges:

### Step 1: Cancel Running Jobs

Before destroying the stack, ensure no jobs are running:

#### Option A: Using AWS Console (Visual Method)
1. Navigate to [AWS Batch Console](https://console.aws.amazon.com/batch/)
2. Click on "Jobs" in the left sidebar
3. Select your job queue (e.g., "AwsBatchOpenmpBenchmarkStack-OpenMPJobQueue...")
4. Filter by status: RUNNING, RUNNABLE, or PENDING
5. Select any active jobs and click "Terminate job"
6. Provide a reason (e.g., "Stack cleanup")
7. Verify all jobs show as SUCCEEDED, FAILED, or CANCELLED

#### Option B: Using AWS CLI (Programmatic Method)
```bash
# List running jobs
aws batch list-jobs --profile your-profile \
  --job-queue <queue-name> \
  --job-status RUNNING

# Terminate each job
aws batch terminate-job --profile your-profile \
  --job-id <job-id> \
  --reason "Stack cleanup"
```

### Step 2: Destroy the Stack

```bash
npx cdk destroy --profile your-profile
```

Type 'y' when prompted to confirm deletion. This will remove:
- ✓ All infrastructure resources (VPC, subnets, NAT gateway)
- ✓ ECR repository and all Docker images inside it
- ✓ Batch compute environment, job queue, and job definitions
- ✓ Lambda function and IAM roles
- ✓ CloudWatch log groups and all logs
- ✓ Security groups and all networking components

### Step 3: Clean Up Local Artifacts (Optional)

```bash
# Remove deployment info file
rm -f deployment-info.json

# Remove all local Docker images (including tagged ECR images)
docker rmi $(docker images | grep openmp-benchmark | awk '{print $3}')

# Clean up Docker build cache (frees significant disk space)
docker builder prune

# Clean up any dangling Docker images
docker image prune
```

### Verification

After cleanup, verify in the AWS Console that:
- The CloudFormation stack is deleted
- No ECR repositories remain for this project
- No VPC resources are left behind
- No unexpected charges appear in your AWS billing

> **Note**: The stack is specifically configured for complete resource deletion. All resources have appropriate removal policies to ensure clean deletion without leaving orphaned resources.
