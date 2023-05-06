#!/bin/bash

# create the virtual environment
python3 -m venv .env

# Install into the virtual environment
source .env/bin/activate

# download requirements
.env/bin/python -m pip install -r requirements.txt --upgrade pip

# Load dependency for lambda functions,
.env/bin/python -m pip install --target lambda/build_os_client_and_bulk_ingest_logevents_handler/ -r lambda/build_os_client_and_bulk_ingest_logevents_handler/requirements.txt

# load boto3
.env/bin/python -m pip install boto3

# Bootstrap the environment
cdk bootstrap

 
