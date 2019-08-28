#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

export AWS_DEFAULT_REGION="us-east-1"

# if cdk.context.json is not provided, copy a fake one
fake_context=false
[ ! -f cdk.context.json ] && fake_context=true

$fake_context && cp $scriptdir/fake.context.json cdk.context.json
npx cdk synth
$fake_context && rm -f cdk.context.json
