#!/bin/bash

# Environment
# - AWS CDK
# - Python3


python3 -m venv .env
source .env/bin/activate
cdk destroy --all --force
rm -rf .env
