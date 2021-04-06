# dotnet-graviton-ecs

This example demonstrates how to build and deploy a .NET 5 application to Amazon Elastic Container Service.

It starts by creating a build machine with .NET 5 SDK, Docker, GIT and AWS CDK installed. The AWS CDK is then used to build a container from the .NET 5 code, push to Amazon ECR and then deploy to a load balanced ECS/EC2 graviton cluster.



### Instructions

1. Create a t4g.small instance with 64-bit (arm) selected, instantiate with the following User Data script: 


```bash
#!/bin/bash

# Install .NET 5 SDK
yum update -y
yum -y install libicu60
su ec2-user -c 'curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin -c 5.0'
echo export PATH="$PATH:/home/ec2-user/.dotnet" >> /etc/profile

# Install Node & AWS CDK
su - ec2-user -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash"
su - ec2-user -c "nvm install node"
su - ec2-user -c "npm install -g aws-cdk"

# Install git
yum install git -y

# Install Docker
amazon-linux-extras install docker
usermod -a -G docker ec2-user
reboot
```

2. Connect to the instance and start Docker 

```bash
service docker start
```

3. Clone the project

```bash
git clone https://github.com/aws-samples/aws-cdk-examples.git
```

Enter the project directory:

```bash
cd csharp/ecs/ecs-ec2-load-balanced-graviton/cdk
```

4. Bootstrap and deploy 

```bash
cdk bootstrap
cdk synth
cdk deploy
```