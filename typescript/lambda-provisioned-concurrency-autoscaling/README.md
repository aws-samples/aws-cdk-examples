
# Provisioned Concurrency AutoScaling for Lambda Function

This example creates Provisioned Concurrency on lambda function and enable autoscaling(target and schedule) configuration with Provisioned Concurrency.


---

## Setup

Clone this repository:
```bash
git clone https://github.com/aws-samples/aws-cdk-examples.git
```

Change directory:
```bash
cd aws-cdk-examples/typescript/lambda-provisioned-concurrency-autoscaling
```

To build this app, you need to be in this example's root folder. Then run the following:
```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.


## Deployment

This stack uses assets, so the toolkit stack must be deployed to the environment. This can be done by running the following command:
```bash
cdk bootstrap aws://account-id/aws-region
```

At this point you can now synthesize the CloudFormation template for this code:
```bash
cdk synth
```
then check the output file in the "cdk.out" directory.

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.



## Test

```bash
npm run test
```

## Clean Up
To clean up, issue this command:
```
cdk destroy
```

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!