#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# Find and build all NPM projects
for pkgJson in $(find typescript -name cdk.json | grep -v node_modules | sort); do
    (
        echo "=============================="
        echo "building project: $(dirname $pkgJson)"
        echo "=============================="

        cd $(dirname $pkgJson)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        rm -rf package-lock.json node_modules
        npm install
        npm run build

        $scriptdir/synth.sh
    )
done
