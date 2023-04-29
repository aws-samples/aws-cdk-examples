#!/bin/bash

# create the virtual environment
python3 -m venv .env
# Install into the virtual environment
source .env/bin/activate
# download requirements
.env/bin/python -m pip install -r requirements.txt --upgrade pip

# Bootstrap the environment
cdk bootstrap

# Set region to deploy the stack
region_default="us-east-1"
echo -e
read -p "Please enter your region to deploy the stack [$region_default]: " region
region="${region:-$region_default}"
aws configure set default.region $region

# Add e-mail for the notification
email_default="user@example.com"
echo -e
read -p "Please enter an e-mail for alert [$email_default]: " email
email="${email:-$email_default}"
sed -i -e 's/user@example.com/'$email'/g' opensearch/opensearch_stack.py

