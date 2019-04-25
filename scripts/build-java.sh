#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# Find and build all Maven projects
for pomFile in $(find java -name pom.xml); do
    (
        cd $(dirname $pomFile)
        mvn compile test

        cp $scriptdir/fake.context.json cdk.context.json
        npx cdk synth
        rm cdk.context.json
    )
done
