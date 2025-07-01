#!/bin/bash

# AWS Batch OpenMP Benchmark - Enhanced Job Submission Script
# Supports multiple benchmark types with optimized parameters
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Enhanced default parameters for quick benchmarks (4GB memory limit)
DEFAULT_SIZE=600000000        # 600M elements for ~5 second runtime (4GB memory)
DEFAULT_MATRIX_SIZE=1200      # 1200x1200 matrix for ~3 second target
DEFAULT_THREADS=0             # 0 = auto-detect all available cores
DEFAULT_BENCHMARK="simple"    # Default benchmark type
DEFAULT_INSTANCE="c5.large"   # Cost-optimized default for demo
DEFAULT_METHOD="batch"
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --size)
            PROBLEM_SIZE="$2"
            shift 2
            ;;
        --matrix-size)
            MATRIX_SIZE="$2"
            shift 2
            ;;
        --threads)
            THREAD_COUNT="$2"
            shift 2
            ;;
        --benchmark-type)
            BENCHMARK_TYPE="$2"
            shift 2
            ;;
        --instance)
            INSTANCE_TYPE="$2"
            shift 2
            ;;
        --method)
            METHOD="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo -e "${GREEN}🚀 AWS Batch OpenMP Enhanced Benchmark Suite${NC}"
            echo "============================================="
            echo ""
            echo -e "${YELLOW}Usage:${NC}"
            echo "  $0 [OPTIONS]"
            echo ""
            echo -e "${YELLOW}Options:${NC}"
            echo "  --size SIZE           Problem size for simple/math/heavy benchmarks (default: $DEFAULT_SIZE)"
            echo "  --matrix-size SIZE    Matrix size for matrix benchmark (default: $DEFAULT_MATRIX_SIZE)"
            echo "  --threads COUNT       Thread count, 0=auto-detect all cores (default: $DEFAULT_THREADS)" 
            echo "  --benchmark-type TYPE Benchmark type (default: $DEFAULT_BENCHMARK)"
            echo "  --instance TYPE       Instance type (default: $DEFAULT_INSTANCE)"
            echo "  --method METHOD       Submission method: batch|lambda (default: $DEFAULT_METHOD)"
            echo "  --dry-run             Show commands without executing"
            echo "  --help, -h            Show this help message"
            echo ""
            echo -e "${YELLOW}Benchmark Types:${NC}"
            echo "  ${PURPLE}simple${NC}  - Basic arithmetic operations (fastest, ~2 seconds)"
            echo "  ${PURPLE}math${NC}    - Mathematical functions: sin, cos, sqrt, pow (~5 seconds)"
            echo "  ${PURPLE}matrix${NC}  - Matrix multiplication (memory intensive, ~3 seconds)"
            echo "  ${PURPLE}heavy${NC}   - Complex arithmetic expressions (~3 seconds)"
            echo "  ${PURPLE}all${NC}     - Run all benchmarks sequentially (~15 seconds total)"
            echo ""
            echo -e "${YELLOW}Instance Types (Recommended):${NC}"
            echo "  ${BLUE}c6i.large${NC}    - 2 vCPUs, 4 GB RAM (development/testing)"
            echo "  ${BLUE}c6i.xlarge${NC}   - 4 vCPUs, 8 GB RAM (recommended default)"
            echo "  ${BLUE}c6i.2xlarge${NC}  - 8 vCPUs, 16 GB RAM (maximum performance)"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0                                        # Simple benchmark with defaults"
            echo "  $0 --benchmark-type all                   # Run comprehensive 5-minute suite"
            echo "  $0 --benchmark-type matrix --instance c6i.2xlarge  # Matrix benchmark on 8 cores"
            echo "  $0 --benchmark-type math --size 100000000 # Math benchmark with custom size"
            echo "  $0 --method lambda --benchmark-type heavy # Heavy benchmark via Lambda"
            echo "  $0 --dry-run --benchmark-type all         # Preview all benchmark commands"
            echo ""
            echo -e "${YELLOW}Expected Runtimes:${NC}"
            echo "  Simple:  ~2 seconds (basic arithmetic)"
            echo "  Math:    ~5 seconds (floating point intensive)"
            echo "  Matrix:  ~3 seconds (memory bound)"
            echo "  Heavy:   ~3 seconds (complex expressions)"
            echo "  All:     ~15 seconds total (runs all benchmarks)"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set defaults for unspecified parameters
PROBLEM_SIZE=${PROBLEM_SIZE:-$DEFAULT_SIZE}
MATRIX_SIZE=${MATRIX_SIZE:-$DEFAULT_MATRIX_SIZE}
THREAD_COUNT=${THREAD_COUNT:-$DEFAULT_THREADS}
BENCHMARK_TYPE=${BENCHMARK_TYPE:-$DEFAULT_BENCHMARK}
INSTANCE_TYPE=${INSTANCE_TYPE:-$DEFAULT_INSTANCE}
METHOD=${METHOD:-$DEFAULT_METHOD}

# Validate benchmark type
case $BENCHMARK_TYPE in
    simple|math|matrix|heavy|all)
        # Valid benchmark type
        ;;
    *)
        echo -e "${RED}❌ Invalid benchmark type: $BENCHMARK_TYPE${NC}"
        echo -e "${YELLOW}Valid types: simple, math, matrix, heavy, all${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}🚀 AWS Batch OpenMP Enhanced Benchmark Suite${NC}"
echo "============================================="

# Check if deployment-info.json exists
if [ ! -f "deployment-info.json" ]; then
    echo -e "${RED}❌ deployment-info.json not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please run the deployment script first:${NC}"
    echo "  ./scripts/build-and-deploy.sh"
    echo ""
    echo "This will create the deployment-info.json file with your AWS resource information."
    exit 1
fi

# Read deployment information
echo -e "${YELLOW}📋 Reading deployment information...${NC}"
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed. Please install jq first.${NC}"
    echo ""
    echo -e "${YELLOW}Installation:${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    echo "  Amazon Linux: sudo yum install jq"
    exit 1
fi

# Extract information from deployment-info.json
AWS_PROFILE=$(jq -r '.awsProfile' deployment-info.json)
AWS_REGION=$(jq -r '.awsRegion' deployment-info.json)
AWS_ACCOUNT=$(jq -r '.awsAccount' deployment-info.json)

# Extract stack outputs
JOB_QUEUE_NAME=$(jq -r '.stackOutputs[] | select(.OutputKey=="JobQueueName") | .OutputValue' deployment-info.json)
JOB_DEFINITION_NAME=$(jq -r '.stackOutputs[] | select(.OutputKey=="JobDefinitionName") | .OutputValue' deployment-info.json)
LAMBDA_FUNCTION_NAME=$(jq -r '.stackOutputs[] | select(.OutputKey=="LambdaFunctionName") | .OutputValue' deployment-info.json)


# Validate that we have the required information
if [ "$JOB_QUEUE_NAME" = "null" ] || [ "$JOB_DEFINITION_NAME" = "null" ] || [ -z "$JOB_QUEUE_NAME" ] || [ -z "$JOB_DEFINITION_NAME" ]; then
    echo -e "${RED}❌ Could not extract AWS Batch information from deployment-info.json${NC}"
    echo ""
    echo -e "${YELLOW}The deployment may have failed or the file is corrupted.${NC}"
    echo "Please redeploy using: ./scripts/build-and-deploy.sh"
    exit 1
fi

# Display estimated runtime based on benchmark type
case $BENCHMARK_TYPE in
    simple)
        ESTIMATED_TIME="~2 seconds"
        ;;
    math)
        ESTIMATED_TIME="~5 seconds"
        ;;
    matrix)
        ESTIMATED_TIME="~3 seconds"
        ;;
    heavy)
        ESTIMATED_TIME="~3 seconds"
        ;;
    all)
        ESTIMATED_TIME="~15 seconds total"
        ;;
esac

echo -e "${YELLOW}Configuration:${NC}"
echo "  AWS Profile: $AWS_PROFILE"
echo "  AWS Region: $AWS_REGION"
echo "  Job Queue: $JOB_QUEUE_NAME"
echo "  Job Definition: $JOB_DEFINITION_NAME"
echo "  Benchmark Type: ${PURPLE}$BENCHMARK_TYPE${NC} (estimated: $ESTIMATED_TIME)"
echo "  Problem Size: $PROBLEM_SIZE"
if [ "$BENCHMARK_TYPE" = "matrix" ]; then
    echo "  Matrix Size: ${MATRIX_SIZE}x${MATRIX_SIZE}"
fi
echo "  Thread Count: $THREAD_COUNT $([ "$THREAD_COUNT" = "0" ] && echo "(auto-detect all cores)")"
echo "  Instance Type: $INSTANCE_TYPE"
echo "  Method: $METHOD"
echo ""

# Generate unique job name with benchmark type
JOB_NAME="openmp-${BENCHMARK_TYPE}-$(date +%s)"

# Build parameters based on benchmark type
PARAMS="size=$PROBLEM_SIZE,threads=$THREAD_COUNT,json=true"
if [ "$BENCHMARK_TYPE" != "simple" ]; then
    PARAMS="$PARAMS,benchmark-type=$BENCHMARK_TYPE"
fi
if [ "$BENCHMARK_TYPE" = "matrix" ]; then
    PARAMS="$PARAMS,matrix-size=$MATRIX_SIZE"
fi

# Submit job based on method
case $METHOD in
    "batch")
        echo -e "${YELLOW}🚀 Submitting $BENCHMARK_TYPE benchmark job via AWS Batch...${NC}"
        
        BATCH_COMMAND="aws batch submit-job --profile $AWS_PROFILE \\
  --job-name \"$JOB_NAME\" \\
  --job-queue \"$JOB_QUEUE_NAME\" \\
  --job-definition \"$JOB_DEFINITION_NAME\" \\
  --parameters $PARAMS"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "${BLUE}Dry run - would execute:${NC}"
            echo "$BATCH_COMMAND"
        else
            echo -e "${YELLOW}Executing:${NC} $BATCH_COMMAND"
            RESULT=$(eval "$BATCH_COMMAND")
            if [ $? -eq 0 ]; then
                JOB_ID=$(echo "$RESULT" | jq -r '.jobId')
                echo ""
                echo -e "${GREEN}✅ Job submitted successfully!${NC}"
                echo "Job Name: $JOB_NAME"
                echo "Job ID: $JOB_ID"
                echo "Benchmark: ${PURPLE}$BENCHMARK_TYPE${NC}"
                echo "Estimated Runtime: $ESTIMATED_TIME"
            else
                echo -e "${RED}❌ Job submission failed${NC}"
                exit 1
            fi
        fi
        ;;
        
    "lambda")
        echo -e "${YELLOW}🚀 Submitting $BENCHMARK_TYPE benchmark job via Lambda function...${NC}"
        
        if [ "$LAMBDA_FUNCTION_NAME" = "null" ] || [ -z "$LAMBDA_FUNCTION_NAME" ]; then
            echo -e "${RED}❌ Lambda function name not found in deployment info${NC}"
            exit 1
        fi
        
        LAMBDA_PAYLOAD="{\"problemSize\": $PROBLEM_SIZE, \"maxThreads\": $THREAD_COUNT, \"instanceType\": \"$INSTANCE_TYPE\", \"benchmarkType\": \"$BENCHMARK_TYPE\""
        if [ "$BENCHMARK_TYPE" = "matrix" ]; then
            LAMBDA_PAYLOAD="$LAMBDA_PAYLOAD, \"matrixSize\": $MATRIX_SIZE"
        fi
        LAMBDA_PAYLOAD="$LAMBDA_PAYLOAD}"
        
        LAMBDA_COMMAND="aws lambda invoke --profile $AWS_PROFILE \\
  --function-name \"$LAMBDA_FUNCTION_NAME\" \\
  --cli-binary-format raw-in-base64-out \\
  --payload '$LAMBDA_PAYLOAD' \\
  response.json"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "${BLUE}Dry run - would execute:${NC}"
            echo "$LAMBDA_COMMAND"
            echo "cat response.json"
        else
            echo -e "${YELLOW}Executing:${NC} $LAMBDA_COMMAND"
            eval "$LAMBDA_COMMAND"
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✅ Lambda invocation successful!${NC}"
                echo -e "${YELLOW}Response:${NC}"
                cat response.json | jq '.'
                rm -f response.json
            else
                echo -e "${RED}❌ Lambda invocation failed${NC}"
                exit 1
            fi
        fi
        ;;
        
    *)
        echo -e "${RED}❌ Unknown method: $METHOD${NC}"
        echo "Supported methods: batch, lambda"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}📊 Monitoring & Next Steps:${NC}"
echo "1. Monitor job status:"
echo "   aws batch describe-jobs --profile $AWS_PROFILE --jobs <JOB_ID>"
echo ""
echo "2. View real-time job logs (once running):"
echo "   aws logs describe-log-streams --profile $AWS_PROFILE --log-group-name /aws/batch/openmp-benchmark --order-by LastEventTime --descending"
echo ""

echo "3. AWS Console URLs:"
echo "   Batch: https://$AWS_REGION.console.aws.amazon.com/batch/home#queues"
echo "   CloudWatch: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group//aws/batch/openmp-benchmark"
echo ""
echo -e "${PURPLE}💡 Pro Tips:${NC}"
if [ "$BENCHMARK_TYPE" = "all" ]; then
    echo "• The 'all' benchmark runs 4 benchmarks sequentially - expect ~15 seconds total"
    echo "• Watch CPU utilization in CloudWatch - should see sustained 90%+ usage"
fi
echo "• Thread count 0 uses auto-detection for optimal CPU core utilization"
echo "• Larger instance types (c6i.2xlarge) will show better parallel scaling"
echo "• Check CloudWatch logs for detailed performance metrics and GFLOPS"
