#!/bin/bash

# AWS Batch OpenMP Benchmark - Build and Deploy Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AWS Profile (required argument)
if [ -z "$AWS_PROFILE" ]; then
    echo -e "${RED}❌ AWS_PROFILE environment variable is required. Please set it before running the script.${NC}"
    echo -e "${YELLOW}Example: AWS_PROFILE=my-profile ./scripts/build-and-deploy.sh${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 AWS Batch OpenMP Benchmark - Build and Deploy${NC}"
echo "=============================================="
echo -e "${YELLOW}Using AWS Profile: ${AWS_PROFILE}${NC}"
echo ""

# Check if AWS CLI is configured with the profile
if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured for profile '$AWS_PROFILE'. Please run 'aws configure --profile $AWS_PROFILE' first.${NC}"
    exit 1
fi

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text)
AWS_REGION=$(aws configure get region --profile $AWS_PROFILE)
ECR_REPOSITORY_URI="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/openmp-benchmark"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  AWS Profile: $AWS_PROFILE"
echo "  AWS Account: $AWS_ACCOUNT"
echo "  AWS Region: $AWS_REGION"
echo "  ECR Repository: $ECR_REPOSITORY_URI"
echo ""

# Step 1: Build the CDK stack
echo -e "${YELLOW}🏗️  Step 1: Building CDK stack...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK build failed${NC}"
    exit 1
fi

# Step 2: Deploy CDK stack
echo -e "${YELLOW}☁️  Step 2: Deploying CDK stack...${NC}"
npx cdk deploy --profile $AWS_PROFILE --require-approval never
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK deployment failed${NC}"
    exit 1
fi

# Step 3: Get ECR login token and login
echo -e "${YELLOW}🔐 Step 3: Logging into ECR...${NC}"
aws ecr get-login-password --profile $AWS_PROFILE --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ECR login failed${NC}"
    exit 1
fi

# Step 4: Build Docker image
echo -e "${YELLOW}🐳 Step 4: Building Docker image...${NC}"
docker build -f docker/Dockerfile -t openmp-benchmark:latest .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Step 5: Tag and push Docker image
echo -e "${YELLOW}📤 Step 5: Pushing Docker image to ECR...${NC}"
docker tag openmp-benchmark:latest $ECR_REPOSITORY_URI:latest
docker push $ECR_REPOSITORY_URI:latest
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker push failed${NC}"
    exit 1
fi

# Step 6: Get stack outputs
echo -e "${YELLOW}📊 Step 6: Getting deployment information...${NC}"
STACK_OUTPUTS=$(aws cloudformation describe-stacks --profile $AWS_PROFILE --stack-name AwsBatchOpenmpBenchmarkStack --query 'Stacks[0].Outputs' --output json)

# Step 7: Save deployment info for automated job submission
echo -e "${YELLOW}💾 Step 7: Saving deployment information...${NC}"
cat > deployment-info.json << EOF
{
  "awsProfile": "$AWS_PROFILE",
  "awsRegion": "$AWS_REGION",
  "awsAccount": "$AWS_ACCOUNT",
  "stackOutputs": $STACK_OUTPUTS,
  "deploymentTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}✅ Deployment info saved to deployment-info.json${NC}"
echo ""
echo -e "${YELLOW}📋 Deployment Information:${NC}"
echo "$STACK_OUTPUTS" | jq -r '.[] | "  \(.OutputKey): \(.OutputValue)"'

echo ""
echo -e "${GREEN}🎉 Your AWS Batch OpenMP Benchmark is ready!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the Lambda function to submit jobs"
echo "2. Monitor jobs in AWS Batch console"

echo "3. View logs in CloudWatch"
echo ""
echo -e "${YELLOW}💡 Usage Tips:${NC}"
echo "• To use a different profile: AWS_PROFILE=my-profile ./scripts/build-and-deploy.sh"
echo "• To test locally first: ./scripts/test-local.sh"
echo "• To clean up: npx cdk destroy --profile $AWS_PROFILE"
