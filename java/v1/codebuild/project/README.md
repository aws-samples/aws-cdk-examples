# Welcome to your CDK Java project!

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

You should explore the contents of this template. It demonstrates a CDK app to create a codebuild Project. 
A codebuild project includes information about how to run a build, including where to get the source code, which build environment to use, which build commands to run, and where to store the build output. In short, build project provides information to Code Build about how to build, as project contains all the information.
To get more details on the properties and methods of a Project object, do look at https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codebuild.Project.html

The cdk.json file tells the CDK Toolkit how to execute your app. This example relies on maven to do that.

## Useful commands

 * `mvn package`     compile and run tests
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
