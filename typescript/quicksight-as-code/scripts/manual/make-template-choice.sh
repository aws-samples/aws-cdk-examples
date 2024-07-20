#!/bin/bash

# Print a header for the template creation process
echo ------------------
echo TEMPLATE CREATION
echo ------------------

# Determine the directory where the script is located
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Prompt text for the user to select a template to create
PS3='Please enter the template to create: '

# Define the options for the user to select from
options=("web" "business" "sales" "people")

# Present the options to the user and execute the selected option
select opt in "${options[@]}"
do
    # Source the make-template.sh script with the selected option as an argument
    source "${scriptDir}/../template/make-template.sh" "$opt"
    break
done
