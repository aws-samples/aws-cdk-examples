# Custom Resource
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples only on the core CDK library, and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This example shows adding a custom resource to a CDK app in Java. This custom resource is useful when considering design of constructs, or separating your architecture into components.


## Building

To build this app, run `mvn compile`. This will download the required
dependencies to compile the Java code.

You can use your IDE to write code and unit tests, but you will need to use the
CDK toolkit if you wish to synthesize/deploy stacks.

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

## Lambda
[`lambda`](./lambda) contains the source code for lambda handler.
After any code changes in the handler, follow these steps to deploy code changes.

    $ mvn package -f lambda/pom.xml
    <generates jar with lambda handler code>

    $ cp lambda/target/lambda-1.0.0-jar-with-dependencies.jar asset/
    <copies lambda handler jar to asset dir>
