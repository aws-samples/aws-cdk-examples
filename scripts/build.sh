#!/bin/bash
set -euxo pipefail
scriptdir=$(cd $(dirname $0) && pwd)
export scriptdir

# Find all of the files named cdk.json and store them in a variable
files=$(find ../ -name 'cdk.json')

# Function to build the stack
build_stack() {
    # Get the path parts
    # language is the first part of the path after the ../
    IFS='/' read -ra path <<< "$1"
    language=${path[1]}
    # file is the remainging part of the path after the first part
    file="${1##\../}"
    
    # cd in the language directory
    cd $scriptdir/../$language
    
    # Execute the build command and check that it succeeds 
    # otherwise return error
    if ! $scriptdir/build-${language}.sh "$file"; then
        echo "Error building $file"
        return 1
    fi
        
}

# Export build_stack function so that it can be used in parallel
export -f build_stack

# Use gnu parallel to run the build script on each file
parallel --keep-order --halt-on-error 1 build_stack ::: $files
