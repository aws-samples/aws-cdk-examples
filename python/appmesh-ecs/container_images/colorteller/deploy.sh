#!/bin/bash

set -eo pipefail

source ~/.bashrc

AWS_ACCOUNT_ID=$1
AWS_DEFAULT_REGION=$2

if [ -z $AWS_ACCOUNT_ID ]; then
    echo "AWS_ACCOUNT_ID environment variable is not set."
    exit 1
fi

if [ -z $AWS_DEFAULT_REGION ]; then
    echo "AWS_DEFAULT_REGION environment variable is not set."
    exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
COLOR_TELLER_IMAGE=${COLOR_TELLER_IMAGE:-"${ECR_URL}/colorteller"}
GO_PROXY=${GO_PROXY:-"https://proxy.golang.org"}
AWS_CLI_VERSION=$(aws --version 2>&1 | cut -d/ -f2 | cut -d. -f1)

ecr_login() {
    if [ $AWS_CLI_VERSION -gt 1 ]; then
        aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | \
            docker login --username AWS --password-stdin ${ECR_URL}
    else
        $(aws ecr get-login --no-include-email)
    fi
}

describe_create_ecr_registry() {
    local repo_name=$1
    local region=$2
    aws ecr describe-repositories --repository-names ${repo_name} --region ${region} \
        || aws ecr create-repository --repository-name ${repo_name} --region ${region}
}

# build
docker build --build-arg GO_PROXY=$GO_PROXY -t $COLOR_TELLER_IMAGE ${DIR}

# push
ecr_login
describe_create_ecr_registry colorteller ${AWS_DEFAULT_REGION}
docker push $COLOR_TELLER_IMAGE
