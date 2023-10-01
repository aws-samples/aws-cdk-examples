# EC2 Instance Creation with CDK

This example will create:

- A new VPC
- Two public subnets
- A security group
- An EC2 instance in one of the subnets

The `/src/config.sh` file is used as [user-data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) for the EC2 instance. Update this with any commands you'd like to be executed when the EC2 instance first boots.

[_learn more about user-data_](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)

## To Build and Deploy

```bash
$ dotnet build
$ cdk bootstrap
$ cdk deploy
```

## To Destroy

```bash
# Destroy all project resources.
$ cdk destroy