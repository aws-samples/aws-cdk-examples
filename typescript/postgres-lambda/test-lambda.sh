#!/bin/bash

# Test script for PostgreSQL Lambda integration

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    exit 1
fi

# Function to display usage
function display_usage {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -f, --function-name NAME    Lambda function name to test"
    echo "  -m, --message MESSAGE       Message to send to Lambda (default: 'Test message')"
    echo "  -h, --help                  Display this help message"
    exit 1
}

# Default values
MESSAGE="Test message"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -f|--function-name)
            FUNCTION_NAME="$2"
            shift
            shift
            ;;
        -m|--message)
            MESSAGE="$2"
            shift
            shift
            ;;
        -h|--help)
            display_usage
            ;;
        *)
            echo "Unknown option: $1"
            display_usage
            ;;
    esac
done

# Check if function name is provided
if [ -z "$FUNCTION_NAME" ]; then
    echo "Error: Lambda function name is required."
    display_usage
fi

# Create payload
PAYLOAD=$(echo "{\"message\": \"$MESSAGE\"}" | jq -c .)

# Create temporary file for response
RESPONSE_FILE=$(mktemp)

echo "Invoking Lambda function: $FUNCTION_NAME"
echo "Payload: $PAYLOAD"

# Invoke Lambda function
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload "$PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    "$RESPONSE_FILE"

# Display response
echo "Response:"
cat "$RESPONSE_FILE" | jq .

# Clean up
rm "$RESPONSE_FILE"
