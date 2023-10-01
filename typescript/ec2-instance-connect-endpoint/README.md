# InstanceConnectEndpoint 

`InstanceConnectEndpoint` is a sample AWS CDK construct that allows you to build [EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-using-eice.html) in your VPC with CDK custom resource.

This sample is generated with [projen](https://github.com/projen/projen) `awscdk-construct` project type so you can reference the `.projenrc.ts` and create your own CDK construct library like this with very little modification.

# sample

```ts
// create an EIC Endpoint in an isolated subnet
new InstanceConnectEndpoint(stack, 'EICEndpoint', {
      subnet: vpc.isolatedSubnets[0],
      preserveClientIp: false,
});
```

See full sample at [integ.default.ts](./src/integ.default.ts).

# deploy the default integration test

```sh
$ cd typescripts/ec2-instance-connect-endpoint
$ yarn install
# configure your AWS CLI
$ npx cdk diff
$ npx cdk deploy
```

On deployment completed, check the instance ID from the output:

```
integ-testing-eicendpoint.InstanceId = i-01d0f0c7ca761ff29
```

Now, connect it with AWS CLI:

```sh
$ aws ec2-instance-connect ssh --instance-id i-01d0f0c7ca761ff29
```

# `awssh`

Alternatively, you can create an `awssh` alias like this:

```sh
alias awssh='aws ec2-instance-connect ssh --instance-id'
```

Now, you can just `awssh` into any ec2 instance behind the endpoint.

```sh
$ awssh i-01d0f0c7ca761ff29
```

# run the tests

```sh
$ yarn test
```

# clean up

```sh
$ npx cdk destroy
```