# CDK Java Example:  Resource Override
<!--BEGIN STABILITY BANNER-->
---

![Stability: REFERENCE](https://img.shields.io/badge/stability-Reference-informational.svg?style=for-the-badge)

> **This is a reference example. It may not build, and exists to demonstrate features*
>
> This example has code elements that will block a successful build, and should be used for reference only.

---
<!--END STABILITY BANNER-->

This example shows the use of the resource overrides (["escape hatch"](https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html)) mechanism.

We add an `AWS::S3::Bucket` resource, and then proceed to change the properties
of the underlying CloudFormation resource.

There are two steps:

* Access the underlying CloudFormation resource by using
  `construct.getNode().getDefaultChild()` or `construct.getNode().findChild(childId)`.
* Change the resource by the various `add[Property]Override()` methods,
  or assigning to properties or `getCfnOptions()`.

**NOTE** The point is to show how to change various aspects of the generated
CloudFormation template. The end result is a template that cannot be successfully
deployed!

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
    <outputs cloudformation template>

    $ cdk deploy
    <deploy stack to your account - trying to deploy this stack will fail, see note above>

    $ cdk diff
    <diff against deployed stack>
