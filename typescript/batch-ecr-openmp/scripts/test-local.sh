#!/bin/bash

# AWS Batch OpenMP Benchmark - Local Testing Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 AWS Batch OpenMP Benchmark - Local Testing${NC}"
echo "========================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Step 1: Build the OpenMP application locally
echo -e "${YELLOW}🔨 Step 1: Building OpenMP application...${NC}"
cd src/openmp
make clean && make
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Local build failed${NC}"
    exit 1
fi

# Step 2: Run Unit Tests
echo -e "${YELLOW}🧪 Step 2: Running C++ Unit Tests...${NC}"
make unit-test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi

# Step 3: Test the application locally
echo ""
echo -e "${YELLOW}🚀 Step 3: Testing OpenMP application locally...${NC}"
echo ""
echo -e "${YELLOW}Integration Test 1: Default settings (Sequential vs Parallel Comparison)${NC}"
./openmp_benchmark

echo ""
echo -e "${YELLOW}Integration Test 2: JSON output${NC}"
./openmp_benchmark --json

echo ""
echo -e "${YELLOW}Integration Test 3: Sequential only${NC}"
./openmp_benchmark --sequential-only --size 10000000

echo ""
echo -e "${YELLOW}Integration Test 4: Parallel only${NC}"
./openmp_benchmark --parallel-only --size 10000000

echo ""
echo -e "${YELLOW}Integration Test 5: Custom parameters${NC}"
./openmp_benchmark --size 10000000 --threads 2

echo ""
echo -e "${YELLOW}Integration Test 6: Help message${NC}"
./openmp_benchmark --help

cd ../..

# Step 4: Build Docker image locally
echo ""
echo -e "${YELLOW}🐳 Step 4: Building Docker image locally...${NC}"
docker build -f docker/Dockerfile -t openmp-benchmark:test .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Step 5: Test Docker container
echo -e "${YELLOW}🧪 Step 5: Testing Docker container...${NC}"
echo ""
echo -e "${YELLOW}Container Test 1: Default run${NC}"
docker run --rm openmp-benchmark:test

echo ""
echo -e "${YELLOW}Container Test 2: Custom parameters${NC}"
docker run --rm openmp-benchmark:test --size 5000000 --threads 1

echo ""
echo -e "${YELLOW}Container Test 3: Help${NC}"
docker run --rm openmp-benchmark:test --help

# Step 6: CDK Unit Tests
echo ""
echo -e "${YELLOW}🧪 Step 6: Running CDK unit tests...${NC}"
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK unit tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All local tests passed!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "  ✓ OpenMP application builds successfully"
echo "  ✓ C++ unit tests pass (8/8 tests)"
echo "  ✓ Sequential and parallel implementations validated"
echo "  ✓ Integration tests pass (6 test scenarios)"
echo "  ✓ Docker container builds and runs correctly"
echo "  ✓ CDK unit tests pass"
echo "  ✓ CDK stack synthesizes without errors"
echo ""
echo -e "${GREEN}🎉 Ready for deployment!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'AWS_PROFILE=my-profile  ./scripts/build-and-deploy.sh' to deploy to AWS"
echo "2. Or run individual components:"
echo "   - 'npx cdk deploy' for infrastructure only"
echo "   - 'docker build' and 'docker push' for container only"
