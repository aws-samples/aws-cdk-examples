#!/bin/bash

# Environment
# - AWS CDK
# - Python3

ACTION='destroy --all'
NAMESPACE=$(whoami)
CDK_OUTPUT_FILE='.cdk_result'

python3 -m venv .env
source .env/bin/activate
pip install -r requirements.txt

# Destroy and collect output in a file
cdk ${ACTION}\
  --force \
  -c namespace=${NAMESPACE} \
  --all \
  2>&1 | tee -a ${CDK_OUTPUT_FILE}

deactivate
rm -rf .env
