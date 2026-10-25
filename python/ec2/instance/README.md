# Create an EC2 Instance in a VPC with Systems Manager

This example creates:

* A custom VPC with public subnets and no NAT gateways
* A `t3.nano` EC2 instance using the latest Amazon Linux 2 image
* An instance IAM role with `AmazonSSMManagedInstanceCore`
* User data that downloads and runs `configure.sh` from a CDK S3 asset
* No inbound SSH rule; use Systems Manager Session Manager for shell access

## Useful commands

* `cdk bootstrap` initializes the CDK environment and asset publishing resources
* `cdk synth` emits the synthesized CloudFormation template
* `cdk diff` previews changes before deployment
* `cdk deploy` deploys the stack to your default AWS account and Region
* `aws ssm start-session --target i-xxxxxxxxx` starts a shell session

The Session Manager command requires the instance ID, AWS credentials with session permissions, and the Session Manager plugin for AWS CLI. The instance must be online and able to reach Systems Manager.
