#!/bin/bash
set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

$scriptdir/build-csharp.sh
$scriptdir/build-java.sh
$scriptdir/build-python.sh
$scriptdir/build-typescript.sh
