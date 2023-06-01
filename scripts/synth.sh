#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

export AWS_DEFAULT_REGION="us-east-1"

# if cdk.context.json is not provided, copy a fake one
fake_context=false
[ ! -f cdk.context.json ] && fake_context=true

if $fake_context; then
  cp $scriptdir/fake.context.json cdk.context.json
fi

npx cdk synth

if $fake_context; then
  rm -f cdk.context.json
fi
