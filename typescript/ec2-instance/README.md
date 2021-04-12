# EC2 Instance Creation with CDK

This example will create:
- a new VPC
- two public subnets
- a security group
- an instance in one of those subnets

The config.sh file in /src can be updated and will run on first boot as the user data.

## To Deploy

- Ensure aws-cdk is installed and bootstrapped
- `npm run build`
- `cdk deploy`

## Output

Ec2CdkStack.DownloadKeyCommand : The command needed to download the private key that was created
Ec2CdkStack.IPAddress : Public IP Address of Instance
Ec2CdkStack.KeyName : Key Name that was created
Ec2CdkStack.sshcommand : The command used to connect to the instance

## Keys and Access

A Key Pair is created as part of this CDK.  The public key will be installed as an authorized key in the instance.  To connect to the instance, you will need to download the private key from aws secretsmanager.  The aws-cli command to do this is included as part of the Output.  This key will be downloaded as `cdk-key.pem` and permissions changed.  The ssh command to connect is also included and will use this key.  

## To Destroy

`cdk destroy` will destroy all elements created.
