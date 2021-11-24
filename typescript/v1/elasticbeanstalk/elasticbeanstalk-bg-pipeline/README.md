## Code Pipeline : Blue/Green deployments to Elastic Beanstalk
<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This examples is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> It additionally requires infrastructure prerequisites that must be created before successful build.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 

---
<!--END STABILITY BANNER-->

Code Pipeline does not allow Blue/Green deployments to Elastic Beanstalk, which is a feature that is very useful towards zero-downtime production deployments.

There are a couple of requirements to make this work:

1. 2 Elastic Beanstalk environments: one Blue, and one Green.

2. A Lambda function that will be used to create an application version from the input artifact, deploy to the blue environment, and swap CNAMEs with the green environment.

3. The Lambda execution role should have permissions to make calls to CodePipeline, and Elastic Beanstalk. 

### Note: Leveraging L1 resources

### Instructions

1. Change the name of the blue env, green env, and the EB application name in "cdk.json"
2. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html

```
npm run build
cdk synth
cdk bootstrap
cdk deploy

```