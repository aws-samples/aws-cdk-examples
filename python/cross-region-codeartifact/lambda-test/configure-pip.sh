#!/bin/bash
export DOMAIN=$DOMAIN
export ACCOUNT=$ACCOUNT
export REPO=$REPO
export REGION_ARTIFACTS=$REGION_ARTIFACTS
export CODEARTIFACT_AUTH_TOKEN=`aws codeartifact get-authorization-token --domain $DOMAIN --domain-owner $ACCOUNT --region $REGION_ARTIFACTS --query authorizationToken --output text`
