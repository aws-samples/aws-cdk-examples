#!/bin/bash
# triggered by scripts/build-${buildlang}.sh $path2 where $path2 is the directory under typescripts
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
projectname="$1"


echo "=============================="
echo "building project: typescript/$projectname"
echo "=============================="

cd "typescript/$projectname";
yarn install --frozen-lockfile
yarn build
yarn test
$scriptdir/synth.sh

exit 0

# # Find and build all NPM projects
# for pkgJson in $(find typescript -name cdk.json | grep -v node_modules | sort); do
#     (
#         echo "=============================="
#         echo "building project: $(dirname $pkgJson)"
#         echo "=============================="

#         cd $(dirname $pkgJson)
#         if [[ -f DO_NOT_AUTOTEST ]]; then exit 0; fi

#         rm -rf package-lock.json node_modules
#         npm install
#         npm run build

#         $scriptdir/synth.sh
#     )
# done
