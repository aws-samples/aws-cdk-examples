# EC2 Instance Creation with CDK

This example will create:

- A new VPC
- Two public subnets
- A security group
- An EC2 instance in one of the subnets

The `/src/config.sh` file is used as [user-data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) for the EC2 instance. Update this with any commands you'd like to be executed when the EC2 instance first boots.

[_learn more about user-data_](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)

## To Deploy

Ensure aws-cdk is installed and [bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```bash
$ npm install -g aws-cdk
$ cdk bootstrap
```

Then build and deploy.

```bash
$ npm run build
$ cdk deploy
```

## Output

- `Ec2CdkStack.DownloadKeyCommand`: The command needed to download the private key that was created.
- `Ec2CdkStack.IPAddress`: Public IP Address of Instance.
- `Ec2CdkStack.KeyName`: Key Name that was created.
- `Ec2CdkStack.sshcommand`: The command used to connect to the instance.

## Keys and Access

A Key Pair is created as part of this project. The public key will be installed as an authorized key in the EC2 instance.

To connect to the instance:

1. Download the private key from aws secretsmanager:

    ```bash
    # This will downloaded the key as `cdk-key.pem` and grant permissions.
    $ aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem
    ```

2. SSH to the instance using the command provided from the stack's output `Ec2CdkStack.sshcommand`.

    For example:

    ```bash
    $ ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@1.111.11.111
    ```

    _Find the command for your specific instance in the stack's output._

## To Destroy

```bash
# Destroy all project resources.
$ cdk destroy
```
