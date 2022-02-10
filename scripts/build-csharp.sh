#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

# install CDK CLI from npm, so that npx can find it later
cd $scriptdir/../csharp
npm install

# Find and build all CSharp projects
for projFile in $(find $scriptdir/../csharp -name cdk.json | grep -v node_modules); do
    (
        echo "=============================="
        echo "building project: $projFile"
        echo "=============================="

        cd $(dirname $projFile)
        if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

        dotnet build src

        $scriptdir/synth.sh
    )
done
