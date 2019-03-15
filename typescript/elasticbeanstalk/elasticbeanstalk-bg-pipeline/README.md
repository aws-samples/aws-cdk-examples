## Code Pipeline : Blue/Green deployments to Elastic Beanstalk

Code Pipeline does not allow Blue/Green deployments to Elastic Beanstalk, which is a feature that is very useful towards zero-downtime production deployments.

There are a couple of requirements to make this work:

1. 2 Elastic Beanstalk environments: one Blue, and one Green.

2. A Lambda function that will be used to create an application version from the input artifact, deploy to the blue environment, and swap CNAMEs with the green environment.

3. The Lambda execution role should have permissions to make calls to CodePipeline, and Elastic Beanstalk. 

### Instructions

1. Change the name of the blue env, green env, and the EB application name in "cdk.json"
2. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html

```
npm run build
cdk synth
cdk bootstrap
cdk deploy

```