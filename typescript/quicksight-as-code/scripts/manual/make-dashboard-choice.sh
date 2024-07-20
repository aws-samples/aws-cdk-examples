#!/bin/bash

# Print a header for the dashboard creation process
echo ------------------
echo DASHBOARD CREATION
echo ------------------

# Determine the directory where the script is located
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Prompt text for the user to select a dashboard to create
PS3='Please enter the dashboard to create: '

# Define the options for the user to select from
# These are the dashboards from the AWS samples
options=("web" "business" "sales" "people")

# Present the options to the user and execute the selected option
select opt in "${options[@]}"
do
    # Source the make-dashboard.sh script with the selected option as an argument
    source ../dashboard/make-dashboard.sh "$opt"
    break
done