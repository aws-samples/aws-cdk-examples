#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# install CDK CLI from npm, so that npx can find it later
cd $scriptdir/../go
npm install

# Find and build all Maven projects
for gomodFile in $(find $scriptdir/../go -name go.mod); do
    (
        echo "=============================="
        echo "building project: $(dirname $gomodFile)"
        echo "=============================="

        cd $(dirname $gomodFile)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        go build ./...
        go test ./...
        $scriptdir/synth.sh
    )
done
