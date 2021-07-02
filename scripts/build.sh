#!/bin/bash

set -euo pipefail
scriptdir=$(cd $(dirname $0) && pwd)

if [[ "${HAS_CSHARP_CHANGES:-}" && "${HAS_CSHARP_CHANGES}" == "true" ]]; then
  $scriptdir/build-csharp.sh
fi

if [[ "${HAS_JAVA_CHANGES:-}" && "${HAS_JAVA_CHANGES}" == "true" ]]; then
  $scriptdir/build-java.sh
fi

if [[ "${HAS_PYTHON_CHANGES:-}" && "${HAS_PYTHON_CHANGES}" == "true" ]]; then
  $scriptdir/build-python.sh
fi

if [[ "${HAS_TYPESCRIPT_CHANGES:-}" && "${HAS_TYPESCRIPT_CHANGES}" == "true" ]]; then
  $scriptdir/build-typescript.sh
fi