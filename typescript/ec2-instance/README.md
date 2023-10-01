# EC2 Instance Creation with CDK

This example will create:

- A new VPC
- Two public subnets
- A security group
- An EC2 instance in one of the subnets
- CloudWatch logs for the instance

## Run Commands at Launch

This example shows a variety of ways to configure and build your EC2 Instance using AWS CDK. We will [run commands on your Linux instance at launch](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) using these methods.

### UserData

```typescript
const userData = UserData.forLinux();
userData.addCommands(
  'yum update -y',
  'curl -sL https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo',
  'curl -sL https://rpm.nodesource.com/setup_18.x | sudo -E bash - ',
  'yum install -y amazon-cloudwatch-agent nodejs python3-pip zip unzip docker yarn',
  'sudo systemctl enable docker',
  'sudo systemctl start docker',
);
```

Here we see [UserData](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-add-user-data.html) being added to EC2 instance and used to set up a variety of services that we can use once the instance has been deployed. These commands will be run as root user and not run interactively.

### CloudInit

```typescript
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['config'],
        },
        configs: {
          config: new InitConfig([
            InitFile.fromObject('/etc/config.json', {
              STACK_ID: Stack.of(this).artifactId,
            }),
            InitFile.fromFileInline(
              '/tmp/amazon-cloudwatch-agent.json',
              './src/resources/server/config/amazon-cloudwatch-agent.json',
            ),
            InitFile.fromFileInline(
              '/etc/config.sh',
              'src/resources/server/config/config.sh',
            ),
            InitFile.fromString(
              '/home/ec2-user/.ssh/authorized_keys',
              props.sshPubKey + '\n',
            ),
            InitCommand.shellCommand('chmod +x /etc/config.sh'),
            InitCommand.shellCommand('/etc/config.sh'),
          ]),
        },
      }),
```

With cloud-init directives, we can copy files to the instance, create new files from strings or objects, and run commands on the instance. In this case, we are configuring our cloudwatch-agent and installing an optional SSH pub key.

### S3 Bucket

```typescript
const assetBucket = new Bucket(this, 'assetBucket', {
  publicReadAccess: false,
  removalPolicy: RemovalPolicy.DESTROY,
  objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
  autoDeleteObjects: true,
});

new BucketDeployment(this, 'assetBucketDeployment', {
  sources: [Source.asset('src/resources/server/assets')],
  destinationBucket: assetBucket,
  retainOnDelete: false,
  exclude: ['**/node_modules/**', '**/dist/**'],
  memoryLimit: 512,
});
```

This demo also includes an S3 bucket that can be accessed by the instance when it is deployed.

This can be used to download files to the instance using UserData:

```typescript
      'mkdir -p /home/ec2-user/sample',
      'aws s3 cp s3://' +
        assetBucket.bucketName +
        '/sample /home/ec2-user/sample --recursive',
```

## Cloudwatch Logs

As part of the deployment, [CloudWatch Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html) is installed, configured, and run. This will allow you to see logs from your EC2 instance in CloudWatch log groups. These logs will be available in the `/ec2/log/ec2-example/` log group.

## Configuration

Three options are available in the `.env` file to customize your instance:

- SSH_PUB_KEY
- CPU_TYPE
- INSTANCE_SIZE

#### SSH_PUB_KEY

If included, this public key will be added to the `/home/ec2-user/.ssh/authorized_keys` file to allow you to SSH to this instance.

#### CPU_TYPE

Valid options are `ARM64` and `X86` and will be used to determine the instance type deployed. `ARM64` will be used as the default if nothing is included.

#### INSTANCE_SIZE

Valid options are `LARGE`, `XLARGE`, `XLARGE2`, and `XLARGE4`. This will be used to determine the size of the instance deployed. `LARGE` will be used if nothing is included.

## Connecting To

Two options are available to connect to the created instance. Once deployed, the CDK will output two commands:

```bash
Outputs:
EC2Example.sshCommand = ssh ec2-user@ec2-192-0-2-161.compute-1.amazonaws.com
EC2Example.ssmCommand = aws ssm start-session --target i-043xxxxxxxxxxxxxx
```

#### SSH

If you had configured a public key in your `.env` file, you can use SSH to connect to the instance.

#### SSM

Alternatively, you can use [SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-start-cli) to connect to the instance. This commands requires AWS CLI and credentials, but does not require a public key to be loaded on the instance.

## To Deploy

1. Configure `.env` file (optional)
2. Install [yarn](https://yarnpkg.com/getting-started/install)

```bash
yarn launch
```

## To Destroy

```bash
yarn cdk destroy
```
