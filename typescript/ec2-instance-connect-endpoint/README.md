# EC2 Instance Connect Endpoint

This is a CDK construct that allows you to build [EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-using-eice.html) in your VPC with a CDK custom resource.

## Usage

```ts
// create an EIC Endpoint in an isolated subnet
new InstanceConnectEndpoint(stack, 'EICEndpoint', {
      subnet: vpc.isolatedSubnets[0],
      preserveClientIp: false,
});
```

See full sample at [bin/app.ts](./bin/app.ts).

## Deploy the sample application

```sh
# Install dependencies
npm install

# Configure your AWS CLI
npm run build
npx cdk diff
npx cdk deploy
```

On deployment completion, check the instance ID from the output:

```
integ-testing-eicendpoint.InstanceId = i-01d0f0c7ca761ff29
```

Now, connect to it with AWS CLI:

```sh
aws ec2-instance-connect ssh --instance-id i-01d0f0c7ca761ff29
```

## `awssh` Shortcut

You can create an `awssh` alias for convenience:

```sh
alias awssh='aws ec2-instance-connect ssh --instance-id'
```

Now, you can quickly connect to any EC2 instance behind the endpoint:

```sh
awssh i-01d0f0c7ca761ff29
```

## Run tests

```sh
npm test
```

## Clean up

```sh
npx cdk destroy
```
