#!/bin/bash
#
# This script is triggered by `build-pull-request.yml` with `scripts/build-${buildlang}.sh $path2 $extra`.
# We concat the arguments for a full given_path and traverse this given_path from top down to find the first package.json
# and run yarn/npm install/build/test and cdk synth in that directory.
#
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
given_path="${1}/${2}"

echo "=============================="
echo "running build for typescript/${given_path}"
echo "=============================="

function build_it() {
  cd $1
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
}

# Split the path into individual directories
IFS='/' read -ra dirs <<< "$given_path"

# Traverse the directories from top down and check for package.json
current_path="typescript/"

# Find the first package.json and build up from the directory of it.
# For example:
# We only build typescript/ecs/sample1 for typescript/ecs/sample1/src/index.ts
for dir in "${dirs[@]}"; do
  current_path="$current_path$dir"
  if [ -f $current_path/package.json ]; then
    build_it ${current_path}
    exit 0
  fi
  current_path="${current_path}/"
done

exit 0
