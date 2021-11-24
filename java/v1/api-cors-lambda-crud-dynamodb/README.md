# CDK Java Example

This is an example of a CDK program written in Java.

## Building

To build this app, run `mvn compile`. This will download the required
dependencies to compile the Java code and create jar for associated software.amazon.awscdk.examples.lambda code.

You can use your IDE to write code and unit tests, but you will need to use the
CDK toolkit if you wish to synthesize/deploy stacks.

If you need to modify the lambda code then do mvn package and copy the
jar file to asset directory in the parent module
## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

Specifically, it will tell the toolkit to use the `mvn exec:java` command as the
entry point of your application. After changing your Java code, you will be able
to run the CDK toolkit commands as usual (Maven will recompile as needed):

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth
    <cloudformation template>

    $ cdk deploy
    <deploy stack to your account>

    $ cdk diff
    <diff against deployed stack>
