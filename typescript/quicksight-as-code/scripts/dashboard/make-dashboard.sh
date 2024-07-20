#!/bin/bash

# Get the first argument passed to the script
opt=$1

# Define template, dashboard, and dataset IDs based on the selected option
template_id="$opt-template"
dashboard_id="$opt-dashboard"
dataset_id="$opt-dataset"

# Set dataset placeholder based on the selected option
case $opt in
    "web")
        ds_placeholder="Web and Social Media Analytics"
        ;;
    "business")
        ds_placeholder="Business Review"
        ;;
    "sales")
        ds_placeholder="Sales Pipeline"
        ;;
    "people")
        ds_placeholder="People Overview"
        ;;
    *) 
        echo "invalid option."
        exit
        ;;
esac

# Print the selected dashboard ID
echo selected dashboard ${dashboard_id}

# Check if the ACCOUNT environment variable is set
if [ "$ACCOUNT" = "" ]; then
    echo " Login first !!!!"
    exit
fi

# Check if the AWS_REGION environment variable is set
if [ "$AWS_REGION" = "" ]; then
    echo " Login first !!!!"
    exit
fi

# Save the current directory and determine the script directory
startDir=$( pwd )
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Clean up any existing dashboard files and delete the existing QuickSight dashboard
echo cleaning up...............................................
rm -f "${scriptDir}/create-dashboard.json" "${scriptDir}/share-dashboard.json"
aws quicksight delete-dashboard --aws-account-id ${ACCOUNT} --dashboard-id "${dashboard_id}"
echo ...........................................clean up complete.
set -e

# Create a new QuickSight dashboard
echo create dashboard..........................................
sed "s/__ACCOUNT__/${ACCOUNT}/g" "${scriptDir}/create-dashboard.BLUEPRINT.json" > "${scriptDir}/create-dashboard.json"
sed -i "s/__REGION__/${AWS_REGION}/g" "${scriptDir}/create-dashboard.json"
sed -i "s/__DATASET__/${dataset_id}/g" "${scriptDir}/create-dashboard.json"
sed -i "s/__DASHBOARD__/${dashboard_id}/g" "${scriptDir}/create-dashboard.json"
sed -i "s/__TEMPLATE__/${template_id}/g" "${scriptDir}/create-dashboard.json"
sed -i "s/__PLACEHOLDER__/${ds_placeholder}/g" "${scriptDir}/create-dashboard.json"
sed -i "s/__NAME__/${ds_placeholder}/g" "${scriptDir}/create-dashboard.json"

# Read the modified dashboard JSON file into a variable
createDashboardJson=$(<"${scriptDir}/create-dashboard.json")
aws quicksight create-dashboard --cli-input-json "$createDashboardJson"
echo .......................................dashboard creation complete.

# Share the QuickSight dashboard
echo share dashboard............................................
sed "s/__ACCOUNT__/${ACCOUNT}/g" "${scriptDir}/share-dashboard.BLUEPRINT.json" > "${scriptDir}/share-dashboard.json"
sed -i "s/__REGION__/${AWS_REGION}/g" "${scriptDir}/share-dashboard.json"
sed -i "s/__DASHBOARD__/${dashboard_id}/g" "${scriptDir}/share-dashboard.json"

# Read the modified share dashboard JSON file into a variable
shareDashboardJson=$(<"${scriptDir}/share-dashboard.json")
aws quicksight update-dashboard-permissions --cli-input-json "${shareDashboardJson}"
echo .............................................dashboard shared.

# Clean up the temporary dashboard files
rm -f "${scriptDir}/create-dashboard.json" "${scriptDir}/share-dashboard.json"
