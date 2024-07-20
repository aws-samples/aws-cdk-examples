#!/bin/bash

# List users to troubleshoot
# aws quicksight list-users --aws-account-id "$ACCOUNT" --namespace default

# set -e
DEV_GROUP_NAME="QS-Developers"
READ_ONLY_GROUP_NAME="QS-Readers"
# these names should be the same as in qs-util.ts

aws quicksight create-group --aws-account-id "$ACCOUNT" --namespace default --group-name "$DEV_GROUP_NAME"

for usr in "dev1" "dev2" "dev3"; do
    aws quicksight create-group-membership --aws-account-id "$ACCOUNT" --namespace default --group-name "$DEV_GROUP_NAME" --member-name "${usr}"
done


aws quicksight create-group --aws-account-id "$ACCOUNT" --namespace default --group-name "$READ_ONLY_GROUP_NAME"

for usr in "business1" "business2"; do
    aws quicksight create-group-membership --aws-account-id "$ACCOUNT" --namespace default --group-name "$READ_ONLY_GROUP_NAME" --member-name "${usr}"
done

