
# CDK Java Example - Application Load Balancer

This is an example of a CDK program written in Java.

It is a Maven-based project, so you can open this directory with any Maven-compatible Java IDE, and you should be able to build and run tests from your IDE.

It demonstrates a CDK app called (`ApplicationLoadBalancerApp`). The app invokes a stack called (`LoadBalancerStack`). This Stack has multiple constructs which create an Application Load Balancer. In addition, a listener is created which listens to targets which point to instances in an Auto Scaling Group. The instances in the Auto Scaling Group are based on Amazon Linux AMIs. All of these constructs are created in a new VPC.

## Building

To build this app, run `mvn compile`. This will download the required dependencies to compile the Java code.

You can use your IDE to write code, but you will need to use the CDK toolkit if you wish to synthesize/deploy stacks.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

Specifically, it will tell the toolkit to use the `mvn exec:java` command as the
entry point of your application. After changing your Java code, you will be able
to run the CDK toolkit commands as usual (Maven will recompile as needed):

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth LoadBalancerStack
    <cloudformation template>

    $ cdk deploy LoadBalancerStack
    <deploy stack to your account>

    $ cdk diff
    <diff against deployed stack>
