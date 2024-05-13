#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
projFile=$1

echo "=============================="
echo "building project: $(dirname $projFile)"
echo "=============================="

cd $scriptdir/../$(dirname $projFile)
if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

mvn -q compile test

$scriptdir/synth.sh