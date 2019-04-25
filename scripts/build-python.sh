#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

python3 -m venv /tmp/.venv

# Find and build all Maven projects
for requirements in $(find python -name requirements.txt); do
    (
        cd $(dirname $requirements)
        [[ ! -f DO_NOT_AUTOTEST ]] || exit

        source /tmp/.venv/bin/activate
        pip install -r requirements.txt

        cp $scriptdir/fake.context.json cdk.context.json
        npx cdk synth
        rm cdk.context.json
    )
done
