#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# install CDK CLI from npm, so that npx can find it later
cd $scriptdir/../go
npm install

# Find and build all Go projects
for projFile in $(find $scriptdir/../go -name cdk.json | grep -v node_modules); do
    (
        echo "=============================="
        echo "building project: $projFile"
        echo "=============================="

        cd $(dirname $projFile)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        go get -d -t && go build

        $scriptdir/synth.sh
    )
done
