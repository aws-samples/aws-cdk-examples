#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# install CDK CLI from npm, so that npx can find it later
cd $scriptdir/../java
npm install

# Find and build all Maven projects
for pomFile in $(find $scriptdir/../java -name pom.xml | grep -v node_modules); do
    (
        echo "=============================="
        echo "building project: $(dirname $pomFile)"
        echo "=============================="

        cd $(dirname $pomFile)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        mvn -q compile test

        $scriptdir/synth.sh
    )
done
