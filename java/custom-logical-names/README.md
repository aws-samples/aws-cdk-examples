# Custom Logical Names

<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This sample shows how you can override the behavior for allocating logical names to CloudFormation resources in the CDK.

It implements a feature that allows users to specify a prefix for all logical names using the `prefix` context key.

## Usage

1. Extend your stacks from [`BaseStack`](src/main/java/com/myorg/BaseStack.java) instead of `Stack`.
2. Specify the context when calling the CLI through `--context prefix=PREFIX`.

## Implementation

The [`BaseStack`](src/main/java/com/myorg/BaseStack.java) class implements this custom behavior. Using a base stack is a
common and recommended pattern for reusing policy within an organization.

Then, any stack that derives from [`BaseStack`](src/main/java/com/myorg/BaseStack.java) will automatically have this
behavior.

## Build

To build this example, you need to be in this example's root directory. Then run the following:

```bash
npm install -g aws-cdk
npm install
cdk synth
```

This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.

## Deploy

Run `cdk deploy --context prefix=PREFIX`. This will deploy / redeploy your Stack to your AWS Account.

## Example

Without prefix:

```shell
$ cdk synth -j
{
  "Resources": {
    "MyTopic86869434": {
      "Type": "AWS::SNS::Topic"
    },
    "MyBucketF68F3FF0": {
      "Type": "AWS::S3::Bucket"
    }
  }
}
```

With prefix:

```shell
$ cdk synth -j -c prefix="MyTeam"
{
  "Resources": {
    "MyTeamMyTopic86869434": {
      "Type": "AWS::SNS::Topic"
    },
    "MyTeamMyBucketF68F3FF0": {
      "Type": "AWS::S3::Bucket"
    }
  }
}
```

## Useful commands

```
* `mvn clean package`     compile and run tests
* `cdk ls`                list all stacks in the app
* `cdk synth`             emits the synthesized CloudFormation template
* `cdk deploy`            deploy this stack to your default AWS account/region
* `cdk diff`              compare deployed stack with current state
* `cdk docs`              open CDK documentation
```