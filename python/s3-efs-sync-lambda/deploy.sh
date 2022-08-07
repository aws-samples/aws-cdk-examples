#!/bin/bash

# Environment
# - AWS CDK
# - Python3


python3 -m venv .env
source .env/bin/activate
pip install pip --upgrade
pip install -r requirements.txt
pip install urllib3 --target=./func
cdk deploy --all --require-approval never
