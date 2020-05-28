
# Create EC2 Instance in new VPC with Systems Manager enabled

This example includes:

* Own VPC with public subnet (following AWS Defaults for new accounts)
* Based on latest Amazon Linux 2
* System Manager replaces SSH (Remote session available trough the AWS Console or the AWS CLI.)
* Userdata executed from script in S3 (`configure.sh`).

## Useful commands

 * `cdk bootstrap`   initialice assets before deploy
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `aws ssm start-session --target i-xxxxxxxxx` remote session for shell access
