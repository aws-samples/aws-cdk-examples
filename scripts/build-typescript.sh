#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# Make sure that the package.json has * dependencies
# for the @aws-cdk libraries.
#
# This looks weird, but we do it pre-1.0 to make sure
# the examples are always up to date with the changing
# API
verify_star_dependencies() {
    broken=$(grep '@aws-cdk' package.json | grep -v '*' || true)
    if [[ "$broken" != "" ]]; then
        echo '================================================='
        echo ' These @aws-cdk dependencies must depend on version "*"'
        echo $broken
        echo '================================================='
        exit 1
    fi
}

# Find and build all NPM projects
for pkgJson in $(find typescript -name cdk.json | grep -v node_modules); do
    (
        echo "=============================="
        echo "building project: $(dirname $pkgJson)"
        echo "=============================="

        cd $(dirname $pkgJson)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        verify_star_dependencies

        rm -rf package-lock.json node_modules
        npm install
        npm run build

        $scriptdir/synth.sh
    )
done
