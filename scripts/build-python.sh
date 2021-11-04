#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

python3 -m venv /tmp/.venv

# install CDK CLI from npm, so that npx can find it later
cd $scriptdir/../python
npm install

# Find and build all Python projects
for requirements in $(find $scriptdir/../python -name requirements.txt  -not -path "$scriptdir/../python/node_modules/*"); do
    (
        echo "=============================="
        echo "building project: $requirements"
        echo "=============================="

        cd $(dirname $requirements)
        echo "Building project at $(dirname $requirements)"
        [[ ! -f DO_NOT_AUTOTEST ]] || exit 0

        source /tmp/.venv/bin/activate
        pip install -r requirements.txt

        $scriptdir/synth.sh
    )
done
