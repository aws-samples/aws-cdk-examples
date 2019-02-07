#!/bin/bash
set -euo pipefail

npm install -g aws-cdk

# Find and build all NPM projects
for pkgJson in $(find typescript -name package.json | grep -v node_modules); do
    (
        cd $(dirname $pkgJson)
        npm install
        npm run build
        cdk synth
    )
done

# Find and build all Maven projects
for pomFile in $(find java -name pom.xml); do
    (
        cd $(dirname $pomFile)
        mvn compile test
        cdk synth
    )
done
