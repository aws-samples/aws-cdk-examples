# Welcome to your CDK Java project!

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

You should explore the contents of this template. It demonstrates a CDK app to create a codebuild source credential cloud formation resource.
Source Credentials includes information about the credentials for a GitHub, GitHub Enterprise, or Bitbucket repository. For Bitbucket, you use app password. FOr Github and Github enterprise, you use personal_access_token. This example is shows the Bitbucket credentials.
We strongly recommend that you use AWS Secrets Manager to store your credentials or the NoEcho parameter to mask your credentials.
To get more details on the properties and methods of a source credential, do look at https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codebuild.CfnSourceCredential.html

The cdk.json file tells the CDK Toolkit how to execute your app. This example relies on maven to do that.

## Useful commands

 * `mvn package`     compile and run tests
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
