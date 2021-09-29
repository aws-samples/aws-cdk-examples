## Elastic Beanstalk Application + Environment
<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This examples is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 

---
<!--END STABILITY BANNER-->

Launches an Elastic Beanstalk Application and an environment within based on the user specified Platform. (https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/list-platform-versions.html)

Sample Platform ARN: "arn:aws:elasticbeanstalk:us-east-1::platform/Tomcat 8 with Java 8 running on 64bit Amazon Linux"

Note: Skipping the exact platform version will make it default to the latest one. 

### Instructions

1. Change the platform in "cdk.json"
2. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html

```
npm run build
cdk synth
cdk bootstrap
cdk deploy

```