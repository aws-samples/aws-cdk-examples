# Custom Logical Names

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