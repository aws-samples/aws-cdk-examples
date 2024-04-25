# AWS Route 53 Backup Solution

## Overview
This repository contains an AWS Cloud Development Kit (CDK) application for backing up AWS Route 53 zone records. As of today (April 2024) AWS does not provide a native backup service for Route 53, making it essential to have a custom solution to safeguard DNS records. This CDK application automatically provisions resources to back up Route 53 zones to an S3 bucket, scheduling backups to occur every day.

## Author
Pedram Jahangiri

## Prerequisites
Before you can deploy this application, ensure you have the following installed:
- Node.js and NPM
- AWS CLI
- Python 3.x and pip
- AWS CDK

## Setup and Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/iut62elec/AWS-Route53-Backup-Solution.git
   cd AWS-Route53-Backup-Solution

2. Configure your AWS profile (replace xxx with your profile name):
    ```bash
    export AWS_PROFILE=xxx
3. Set up a Python virtual environment and install AWS CDK and Node.js version 18 and the required Python libraries:
    ```bash
    python3.11 -m venv .venv
    source .venv/bin/activate
    npm install -g aws-cdk@latest
    npm update -g aws-cdk
    nvm install 18
    nvm use 18
    pip install --upgrade pip
    pip install aws-cdk.aws-s3 aws-cdk.aws-lambda aws-cdk.aws-events aws-cdk.aws-events-targets aws-cdk.aws-iam

4. Bootstrap CDK (replace aws://xxx/us-east-1 with your AWS account and region) and deploy the stack:
    ```bash
    cdk bootstrap aws://xxx/us-east-1
    cdk deploy

## Application Components
1. S3 Bucket: Stores the Route 53 zone backups.
2. Lambda Function: Executes the backup process every day, writing the zone records to the S3 bucket.
3. IAM Roles: Ensures the Lambda function has necessary permissions to access Route 53 and S3.
4. EventBridge Rule: Triggers the Lambda function on a scheduled basis.



    
## Removing the Solution
Run the following command in your terminal where the CDK project is initialized:

```bash
cdk destroy
```

## Contributing
Feel free to contribute to this project by submitting pull requests or reporting issues. Your feedback is appreciated!


## License
This project is licensed under the MIT License.

## Disclaimer
This repository and its contents are not endorsed by or affiliated with Amazon Web Services (AWS) or any other third-party entities. It represents my personal viewpoints and not those of my past or current employers. All third-party libraries, modules, plugins, and SDKs are the property of their respective owners.