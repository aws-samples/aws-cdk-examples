#!/bin/bash


# Paths to the deployment scripts
GatewayScriptPath="./container_images/gateway/deploy.sh"
ColorTellerScriptPath="./container_images/colorteller/deploy.sh"

# Retrieve the AWS account ID and default region
account_id=$(aws sts get-caller-identity --query Account --output text)
default_region=$(aws configure get region)

# Print the retrieved account ID
echo "Account ID: $account_id"
echo "Default Region: $default_region"

# Execute the deployment scripts
{
    gateway_result=$(bash "$GatewayScriptPath" "$account_id" "$default_region" 2>&1)
    echo "Gateway Result: $gateway_result"
} || {
    echo "Error occurred while running the Gateway script"
    exit 1
}

{
    colorteller_result=$(bash "$ColorTellerScriptPath" "$account_id" "$default_region" 2>&1)
    echo "ColorTeller Result: $colorteller_result"
} || {
    echo "Error occurred while running the ColorTeller script"
    exit 1
}

