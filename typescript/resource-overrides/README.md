# Resource Override
<!--BEGIN STABILITY BANNER-->
---

![Stability: REFERENCE](https://img.shields.io/badge/stability-Reference-informational.svg?style=for-the-badge)

> **This is a reference example. It may not build, and exists to demonstrate features*
>
> This example has code elements that will block a successful build, and should be used for reference only.

---
<!--END STABILITY BANNER-->

This example shows the use of the resource overrides ("escape hatch") mechanism.
We add an `AWS::S3::Bucket` resource, and then proceed to change the properties
of the underlying CloudFormation resource.

There are two steps:

* Access the underlying CloudFormation resource by using
  `construct.node.defaultChild` or `construct.node.findChild()`.
* Change the resource by the various `add[Property]Override()` methods,
  or assigning to properties or `cfnOptions`.

**NOTE** The point is to show how to change various aspects of the generated
CloudFormation template. The end result is a template that cannot be succesfully
deployed!
