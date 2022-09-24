## Elastic Beanstalk Application + Environment

If build is unsuccessful and this is the first Elastic Beanstalk application that you have deployed in your account it's likely missing the 'aws-elasticbeanstalk-ec2-role' role. You can either create a Elastic Beanstalk application from the AWS Console or you can un-comment lines 23-32 in the index.ts file.

Launches an Elastic Beanstalk Application and an environment within based on the user specified Platform. (https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/list-platform-versions.html)

Sample Solution Stack: "64bit Amazon Linux 2 v4.2.18 running Tomcat 8.5 Corretto 11"

Note: As Elastic Beanstalk updates the platform version you may need grab the latest from the [Supported Platforms](https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html) for this to deploy. 

### Instructions

1. Change the platform in "cdk.json"
2. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html

```
npm install
cdk synth
cdk deploy
```
