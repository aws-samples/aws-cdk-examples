#!/bin/bash
#
# This script is triggered by `build-pull-request.yml` with `scripts/build-${buildlang}.sh $path2 $extra`.
# We concat the arguments for a full given_path and traverse this given_path from top down to find the first package.json
# and run yarn/npm install/build/test and cdk synth in that directory.
#
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
projFile=$1

echo "=============================="
echo "running build for typescript/${projFile}"
echo "=============================="

cd $scriptdir/../$(dirname $projFile)
if [ -f DO_NOT_AUTOTEST ]; then 
  echo "found DO_NOT_AUTOTEST, skip it."
  return
fi
# Check if yarn.lock exists
if [ -f "yarn.lock" ]; then
    echo "yarn.lock file found. Running 'yarn install'..."
    yarn install --frozen-lockfile
    yarn build
    npm run --if-present test
# Check if package-lock.json exists
elif [ -f "package-lock.json" ]; then
    echo "package-lock.json file found. Running 'npm ci'..."
    npm ci
    echo "Running 'npm build'..."
    npm run build
    echo "Running 'npm test'..."
    npm run --if-present test
else
    echo "No lock files found (yarn.lock or package-lock.json) but package.json available. Running 'yarn install'... "
    yarn install
    yarn build
    npm run --if-present test
fi
# try cdk synth
$scriptdir/synth.sh