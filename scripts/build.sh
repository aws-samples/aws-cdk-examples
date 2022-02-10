#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

$scriptdir/build-csharp.sh
$scriptdir/build-java.sh
$scriptdir/build-go.sh
$scriptdir/build-python.sh
$scriptdir/build-typescript.sh
