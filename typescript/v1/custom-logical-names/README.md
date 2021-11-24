# Custom Logical Names
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This sample shows how you can override the behavior for allocating
logical names for CloudFormation resources in the CDK.

It implements a feature that allows users to specify a prefix for
all logical names using the `prefix` context key.

## Usage

1. Extend your stacks from `BaseStack` instead of from `Stack`.
2. Specify context when calling the CLI through `--context prefix=PREFIX`.

## Implementation

The `BaseStack` class implements this custom behavior. Using a base stack is a a
common and recommended pattern for reusing policy within an organization.

Then, any stack that derives from `BaseStack` will automatically have this
behavior.

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy --context prefix=PREFIX`. This will deploy / redeploy your Stack to your AWS Account.

## Example

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

Now with prefix:

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