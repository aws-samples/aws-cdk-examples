# Welcome to your CDK Java project!

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

You should explore the contents of this template. It demonstrates a CDK app to create a codebuild ReportGroup cloud formation resource.
A report group contains test reports and specifies shared settings. For each report group configured in a build project, a run of the build project creates a test report. Multiple runs of a build project configured with a report group create multiple test reports in that report group, each with results of the same test cases specified for that report group.
The test cases are specified for a report group in the buildspec file of a build project. You can specify up to 5 report groups in one build project.
To get more details on the properties and methods of a refor group, do look at https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codebuild.CfnReportGroup.html

The cdk.json file tells the CDK Toolkit how to execute your app. This example relies on maven to do that.

## Useful commands

 * `mvn package`     compile and run tests
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
