#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
npm install -g aws-cdk

# Make sure that the package.json has * dependencies
# for the @aws-cdk libraries.
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
for pkgJson in $(find typescript -name package.json | grep -v node_modules); do
    (
        cd $(dirname $pkgJson)

        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        verify_star_dependencies

        npm install
        npm run build

        cp $scriptdir/fake.context.json cdk.context.json
        npx --package aws-cdk cdk synth
        rm cdk.context.json
    )
done
