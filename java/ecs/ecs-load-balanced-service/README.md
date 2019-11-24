
# CDK Java Example - ECS NLB Pattern

This is an example of a CDK program written in Java.

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

It demonstrates a CDK app called (`ECSNLBPatternApp`). The app invokes a stack called (`ECSNLBPatternStack`). This Stack demonstartes the usage of an ECS Pattern. This Pattern is used to deploy a Network Load Balanced ECS Service with just one construct. This Construct creates an ECS Service with EC2 instances which are behing a Network Load Balancer in a new VPC. The EC2 instances are based on Amazon Linux ECS Optimized images and are in an Auto Scaling Group. Patterns inherently apply all the permissions that are needed as well. 

## Building

To build this app, run `mvn compile`. This will download the required dependencies to compile the Java code.

You can use your IDE to write code, but you will need to use the CDK toolkit if you wish to synthesize/deploy stacks.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

Specifically, it will tell the toolkit to use the `mvn exec:java` command as the entry point of your application. After changing your Java code, you will be able
to run the CDK toolkit commands as usual (Maven will recompile as needed):

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth MyFirstEECSNLBPatternStackCSCluster
    <cloudformation template>

    $ cdk deploy ECSNLBPatternStack
    <deploy stack to your account>

    $ cdk diff
    <diff against deployed stack>