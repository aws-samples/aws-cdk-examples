#!/bin/bash

# create the virtual environment
python3 -m venv .env

# Install into the virtual environment
source .env/bin/activate

# download requirements
.env/bin/python -m pip install -r requirements.txt --upgrade pip

# load boto3
.env/bin/python -m pip install boto3

# Bootstrap the environment
cdk bootstrap

# Synthesize
cdk synth


