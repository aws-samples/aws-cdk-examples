#!/bin/bash

# Environment
# - AWS CDK
# - Python3

ACTION='deploy --all'
NAMESPACE=$(whoami)
CDK_OUTPUT_FILE='.cdk_result'

rm -rf ${CDK_OUTPUT_FILE} # so this script doesn't drive us insane

# Activate Python virtual environment
python3 -m venv .env
source .env/bin/activate
pip install -r requirements.txt

# Deploy and collect output in a file, for parsing after
cdk ${ACTION}\
  --require-approval never \
  -c namespace=${NAMESPACE} \
  --all \
  2>&1 | tee -a ${CDK_OUTPUT_FILE}

# Strip .outputs to only outputs.
#sed -n -e '/Outputs:/,/^$/ p' ${CDK_OUTPUT_FILE} > .outputs
