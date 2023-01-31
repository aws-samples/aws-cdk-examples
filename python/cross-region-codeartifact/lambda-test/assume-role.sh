#!/bin/bash
ROLE=$1
SESSION_NAME=$2

# Unset AWS credentials stored in env so that every time this script runs,
# it will use the AWS CodeBuild service role to assume the target IAM roles.
unset AWS_SESSION_TOKEN
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY

cred=$(aws sts assume-role --role-arn "$ROLE" \
                           --role-session-name "$SESSION_NAME" \
                           --query '[Credentials.AccessKeyId,Credentials.SecretAccessKey,Credentials.SessionToken]' \
                           --output text)

ACCESS_KEY_ID=$(echo "$cred" | awk '{ print $1 }')
export AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID

SECRET_ACCESS_KEY=$(echo "$cred" | awk '{ print $2 }')
export AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

SESSION_TOKEN=$(echo "$cred" | awk '{ print $3 }')
export AWS_SESSION_TOKEN=$SESSION_TOKEN
