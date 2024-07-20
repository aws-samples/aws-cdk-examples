#!/bin/bash

# Get the first argument passed to the script
opt="$1"

# Determine the directory where the script is located
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Define template, analysis, and dataset IDs based on the selected option
template_id="$opt-template"
analysis_id="$opt-analysis"
dataset_id="$opt-ds"

# Debug/Print the selected template ID
echo selected template ${template_id}

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

# Clean up any existing template files and delete the existing QuickSight template
echo cleaning up...............................................
rm -f "${scriptDir}/create-template.json" "${scriptDir}/share-template.json"
aws quicksight delete-template --aws-account-id $ACCOUNT --template-id "${template_id}"
echo ...........................................clean up complete.
set -e

# Create a new QuickSight template
echo create template...........................................
sed "s/__ACCOUNT__/${ACCOUNT}/g" "${scriptDir}/create-template-${opt}.BLUEPRINT.json" > "${scriptDir}/create-template.json"
sed -i "s/__ANALYSIS__/${analysis_id}/g" "${scriptDir}/create-template.json"
sed -i "s/__TEMPLATE__/${template_id}/g" "${scriptDir}/create-template.json"
sed -i "s/__DATASET__/${dataset_id}/g" "${scriptDir}/create-template.json"
sed -i "s/__REGION__/${AWS_REGION}/g" "${scriptDir}/create-template.json"

# Read the modified template JSON file into a variable
createTemplateJson=$(<"${scriptDir}/create-template.json")

# Use the AWS CLI to create the QuickSight template with the modified JSON
aws quicksight create-template --cli-input-json "${createTemplateJson}"

echo .......................................template creation complete.

# Describe the template definition and save it to a file
aws quicksight describe-template-definition --template-id "${template_id}" --aws-account-id $ACCOUNT > "${scriptDir}/../../template-defs/${opt}-template-def.json"

# Remove lines containing "Id\"" from the template definition file for review
grep -v Id\"  "${scriptDir}/../../template-defs/${opt}-template-def.json" > "${scriptDir}/../../template-defs/review/${opt}-template-def.json"

# Clean up the temporary template files
rm -f "${scriptDir}/create-template.json" "${scriptDir}/share-template.json"
