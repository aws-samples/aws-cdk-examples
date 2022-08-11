#!/bin/bash

if [[ $# -ge 3 ]]; then
    export CDK_DEPLOY_ACCOUNT=$1
    export CDK_DEPLOY_REGION=$2
    shift; shift
    npx cdk "$@"
    exit $?
else
    echo 1>&2 "Provide aws account number and region code as first two args."
    echo 1>&2 "Additional args are passed through to cdk command."
    exit 1
fi
