
# CDK Java Example - ECS Fargate Local Image

This is an example of a CDK program written in Java.

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

It demonstrates a CDK app called (`FargateLocalImageApp`). The app invokes a stack called (`FargateLocalImageStack`). This Stack demonstrates the usage of a Pattern which creates a Fargate Service with a Network Load Balancer. This example demonstrates the building of a Docker Image locally. Subsequently, it uploads the image to ECR (Elastic Container Registry) and creates a service. 

## Building

To build this app, run `mvn compile`. This will download the required dependencies to compile the Java code.

You can use your IDE to write code, but you will need to use the CDK toolkit if you wish to synthesize/deploy stacks.

This example needs Docker to be installed on your local machine. 

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

Specifically, it will tell the toolkit to use the `mvn exec:java` command as the entry point of your application. After changing your Java code, you will be able
to run the CDK toolkit commands as usual (Maven will recompile as needed):

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth FargateLocalImageStack
    <cloudformation template>

    $ cdk deploy FargateLocalImageStack
    <deploy stack to your account>

    $ cdk diff
    <diff against deployed stack>