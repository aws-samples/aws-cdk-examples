#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

npm install -g aws-cdk

# Find and build all NPM projects
for pkgJson in $(find typescript -name package.json | grep -v node_modules); do
    (
        cd $(dirname $pkgJson)

        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        npm install
        npm run build

        cp $scriptdir/fake.context.json cdk.context.json
        cdk synth
        rm cdk.context.json
    )
done

# Find and build all Maven projects
for pomFile in $(find java -name pom.xml); do
    (
        cd $(dirname $pomFile)
        mvn compile test

        cp $scriptdir/fake.context.json cdk.context.json
        cdk synth
        rm cdk.context.json
    )
done
